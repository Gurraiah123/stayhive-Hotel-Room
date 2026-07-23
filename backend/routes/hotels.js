// routes/hotels.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/hotels/search?city=Goa&checkIn=2026-08-01&checkOut=2026-08-02&guests=2
router.get('/search', async (req, res) => {
  try {
    const { city, checkIn, checkOut, guests } = req.query;
    if (!city) return res.status(400).json({ error: 'city query param is required' });

    const [hotels] = await pool.query(
      `SELECT h.hotel_id, h.name, h.address, h.description, h.star_rating,
              h.guest_rating, h.amenities, h.cover_image,
              MIN(rt.base_price) AS starting_price
       FROM hotels h
       JOIN cities c ON h.city_id = c.city_id
       JOIN room_types rt ON rt.hotel_id = h.hotel_id
       WHERE c.name LIKE ? AND h.is_active = TRUE
         AND rt.max_occupancy >= ?
       GROUP BY h.hotel_id
       ORDER BY h.guest_rating DESC`,
      [`%${city}%`, guests || 1]
    );

    res.json({ count: hotels.length, checkIn, checkOut, hotels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/hotels/:id  — full hotel detail with room types
router.get('/:id', async (req, res) => {
  try {
    const hotelId = req.params.id;

    const [hotelRows] = await pool.query(
      `SELECT h.*, c.name AS city_name, c.state
       FROM hotels h JOIN cities c ON h.city_id = c.city_id
       WHERE h.hotel_id = ?`,
      [hotelId]
    );
    if (hotelRows.length === 0) return res.status(404).json({ error: 'Hotel not found' });

    const [roomTypes] = await pool.query(
      `SELECT * FROM room_types WHERE hotel_id = ?`,
      [hotelId]
    );

    const [reviews] = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.full_name
       FROM reviews r JOIN users u ON r.user_id = u.user_id
       WHERE r.hotel_id = ? ORDER BY r.created_at DESC LIMIT 10`,
      [hotelId]
    );

    res.json({ hotel: hotelRows[0], roomTypes, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hotel details' });
  }
});

// GET /api/hotels/:id/availability?roomTypeId=2&checkIn=2026-08-01&checkOut=2026-08-03
router.get('/:id/availability', async (req, res) => {
  try {
    const { roomTypeId, checkIn, checkOut } = req.query;
    if (!roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'roomTypeId, checkIn, checkOut are required' });
    }

    const [rows] = await pool.query(
      `SELECT stay_date, rooms_available, price_override
       FROM room_availability
       WHERE room_type_id = ? AND stay_date >= ? AND stay_date < ?`,
      [roomTypeId, checkIn, checkOut]
    );

    const isFullyAvailable = rows.length > 0 && rows.every(r => r.rooms_available > 0);
    res.json({ isFullyAvailable, nights: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

module.exports = router;
