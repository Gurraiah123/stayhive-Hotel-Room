// routes/bookings.js
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings  — create a booking (requires login)
router.post('/', authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { hotelId, roomTypeId, checkIn, checkOut, numRooms, numGuests } = req.body;
    if (!hotelId || !roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'hotelId, roomTypeId, checkIn, checkOut are required' });
    }

    await conn.beginTransaction();

    // Lock and verify availability for every night of the stay
    const [nights] = await conn.query(
      `SELECT stay_date, rooms_available FROM room_availability
       WHERE room_type_id = ? AND stay_date >= ? AND stay_date < ?
       FOR UPDATE`,
      [roomTypeId, checkIn, checkOut]
    );

    const requestedRooms = numRooms || 1;
    const insufficientNight = nights.find(n => n.rooms_available < requestedRooms);
    if (nights.length === 0 || insufficientNight) {
      await conn.rollback();
      return res.status(409).json({ error: 'Rooms not available for the selected dates' });
    }

    // Decrement inventory for each night
    for (const night of nights) {
      await conn.query(
        `UPDATE room_availability SET rooms_available = rooms_available - ?
         WHERE room_type_id = ? AND stay_date = ?`,
        [requestedRooms, roomTypeId, night.stay_date]
      );
    }

    // Price = base_price (or override) summed across nights * rooms
    const [[roomType]] = await conn.query(
      'SELECT base_price FROM room_types WHERE room_type_id = ?',
      [roomTypeId]
    );
    const totalAmount = nights.reduce(
      (sum, n) => sum + Number(n.price_override || roomType.base_price),
      0
    ) * requestedRooms;

    const [result] = await conn.query(
      `INSERT INTO bookings
        (user_id, hotel_id, room_type_id, check_in, check_out, num_rooms, num_guests, total_amount, status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'unpaid')`,
      [req.user.userId, hotelId, roomTypeId, checkIn, checkOut, requestedRooms, numGuests || 1, totalAmount]
    );

    await conn.commit();
    res.status(201).json({ bookingId: result.insertId, totalAmount, status: 'confirmed' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Booking failed' });
  } finally {
    conn.release();
  }
});

// GET /api/bookings/me — bookings for the logged-in user
router.get('/me', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, h.name AS hotel_name, rt.name AS room_type_name
       FROM bookings b
       JOIN hotels h ON b.hotel_id = h.hotel_id
       JOIN room_types rt ON b.room_type_id = rt.room_type_id
       WHERE b.user_id = ?
       ORDER BY b.booked_at DESC`,
      [req.user.userId]
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].user_id !== req.user.userId) return res.status(403).json({ error: 'Not your booking' });

    await pool.query(`UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?`, [req.params.id]);
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

module.exports = router;
