// script.js — talks to the StayHive backend API
const API_BASE = 'http://40.192.0.73:5000/api';

let authToken = localStorage.getItem('stayhive_token') || null;
let currentUser = JSON.parse(localStorage.getItem('stayhive_user') || 'null');

const $ = (sel) => document.querySelector(sel);
const hotelModal = $('#hotelModal');
const authModal = $('#authModal');

// ---------- toast ----------
function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2600);
}

// ---------- auth UI state ----------
function refreshAuthUI(){
  const loggedIn = !!authToken;
  $('#loginBtn').classList.toggle('hidden', loggedIn);
  $('#signupBtn').classList.toggle('hidden', loggedIn);
  $('#myBookingsBtn').classList.toggle('hidden', !loggedIn);
  $('#logoutBtn').classList.toggle('hidden', !loggedIn);
}
refreshAuthUI();

$('#logoutBtn').addEventListener('click', () => {
  authToken = null; currentUser = null;
  localStorage.removeItem('stayhive_token');
  localStorage.removeItem('stayhive_user');
  refreshAuthUI();
  showToast('Logged out');
});

function openAuth(mode){
  renderAuthForm(mode);
  authModal.showModal();
}
$('#loginBtn').addEventListener('click', () => openAuth('login'));
$('#signupBtn').addEventListener('click', () => openAuth('signup'));
$('#closeAuthModal').addEventListener('click', () => authModal.close());

function renderAuthForm(mode){
  const isLogin = mode === 'login';
  $('#authContent').innerHTML = `
    <h2>${isLogin ? 'Welcome back' : 'Create your account'}</h2>
    <p class="muted">${isLogin ? 'Log in to book and manage your stays.' : 'Sign up to start booking budget stays.'}</p>
    <form class="auth-form" id="authForm">
      ${isLogin ? '' : `
        <input type="text" id="fullName" placeholder="Full name" required>
        <input type="tel" id="phone" placeholder="Phone number" required>
      `}
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Password" required minlength="6">
      <button type="submit" class="btn btn-primary">${isLogin ? 'Log in' : 'Sign up'}</button>
    </form>
    <p class="auth-switch">
      ${isLogin ? "New here?" : "Already have an account?"}
      <button id="switchAuth">${isLogin ? 'Sign up' : 'Log in'}</button>
    </p>
  `;
  $('#switchAuth').addEventListener('click', () => renderAuthForm(isLogin ? 'signup' : 'login'));

  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value;
    const password = $('#password').value;
    try {
      const body = isLogin
        ? { email, password }
        : { fullName: $('#fullName').value, phone: $('#phone').value, email, password };
      const res = await fetch(`${API_BASE}/auth/${isLogin ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('stayhive_token', authToken);
      localStorage.setItem('stayhive_user', JSON.stringify(currentUser));
      refreshAuthUI();
      authModal.close();
      showToast(isLogin ? `Welcome back, ${currentUser.fullName}` : 'Account created — you\'re in!');
    } catch (err) {
      showToast(err.message);
    }
  });
}

// ---------- search ----------
$('#searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = $('#cityInput').value.trim();
  const checkIn = $('#checkIn').value;
  const checkOut = $('#checkOut').value;
  const guests = $('#guests').value;
  await runSearch(city, checkIn, checkOut, guests);
});

async function runSearch(city, checkIn, checkOut, guests){
  $('#resultsTitle').textContent = `Searching stays in ${city}…`;
  $('#resultsMeta').textContent = '';
  $('#resultsGrid').innerHTML = '';

  try {
    const params = new URLSearchParams({ city, checkIn, checkOut, guests });
    const res = await fetch(`${API_BASE}/hotels/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');

    $('#resultsTitle').textContent = data.count
      ? `${data.count} stay${data.count > 1 ? 's' : ''} in ${city}`
      : `No stays found in ${city}`;
    $('#resultsMeta').textContent = checkIn && checkOut ? `${checkIn} → ${checkOut} · ${guests} guest(s)` : '';

    $('#resultsGrid').innerHTML = data.hotels.map(hotelCard).join('');

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => openHotelDetail(btn.dataset.id, checkIn, checkOut));
    });
  } catch (err) {
    $('#resultsTitle').textContent = 'Something went wrong';
    $('#resultsMeta').textContent = err.message;
  }
}

function hotelCard(h){
  const amenities = safeParseAmenities(h.amenities).slice(0, 4);
  return `
    <article class="hotel-card">
      <div class="thumb"><span class="rating-pill">★ ${Number(h.guest_rating).toFixed(1)}</span></div>
      <div class="body">
        <h3>${h.name}</h3>
        <p class="addr">${h.address}</p>
        <div class="amenities">${amenities.map(a => `<span>${a}</span>`).join('')}</div>
        <div class="card-footer">
          <span class="key-tag"><small>from</small>₹${Math.round(h.starting_price)}</span>
          <button class="view-btn" data-id="${h.hotel_id}">View rooms</button>
        </div>
      </div>
    </article>
  `;
}

function safeParseAmenities(raw){
  try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || []); }
  catch { return []; }
}

// ---------- hotel detail + booking ----------
async function openHotelDetail(hotelId, checkIn, checkOut){
  $('#modalContent').innerHTML = '<p class="muted">Loading…</p>';
  hotelModal.showModal();

  try {
    const res = await fetch(`${API_BASE}/hotels/${hotelId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const { hotel, roomTypes, reviews } = data;
    const amenities = safeParseAmenities(hotel.amenities);

    $('#modalContent').innerHTML = `
      <h2>${hotel.name}</h2>
      <p class="muted">${hotel.address}, ${hotel.city_name} · ★ ${Number(hotel.guest_rating).toFixed(1)}</p>
      <p>${hotel.description || ''}</p>
      <div class="amenities" style="margin:10px 0 20px;">${amenities.map(a => `<span>${a}</span>`).join('')}</div>

      <h3 style="font-size:1.1rem; margin-bottom:10px;">Room types</h3>
      <div id="roomList">
        ${roomTypes.map(rt => `
          <div class="room-row">
            <div>
              <div class="rt-name">${rt.name}</div>
              <div class="rt-meta">Up to ${rt.max_occupancy} guests · ${rt.breakfast_incl ? 'Breakfast included' : 'Room only'} · ${rt.refundable ? 'Free cancellation' : 'Non-refundable'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="key-tag coral"><small>/night</small>₹${Math.round(rt.base_price)}</span>
              <button class="book-btn" data-room-type="${rt.room_type_id}" data-hotel="${hotel.hotel_id}">Book</button>
            </div>
          </div>
        `).join('')}
      </div>

      ${reviews.length ? `
        <h3 style="font-size:1.1rem; margin:20px 0 6px;">Guest reviews</h3>
        ${reviews.map(r => `
          <div class="review">
            <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
            <p style="margin:4px 0 0; font-size:0.9rem;">${r.comment || ''}</p>
            <p class="muted" style="font-size:0.78rem; margin-top:2px;">${r.full_name}</p>
          </div>
        `).join('')}
      ` : ''}
    `;

    document.querySelectorAll('.book-btn').forEach(btn => {
      btn.addEventListener('click', () => handleBook(btn.dataset.hotel, btn.dataset.roomType, checkIn, checkOut));
    });
  } catch (err) {
    $('#modalContent').innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

async function handleBook(hotelId, roomTypeId, checkIn, checkOut){
  if (!authToken) {
    hotelModal.close();
    showToast('Log in to complete your booking');
    openAuth('login');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({
        hotelId: Number(hotelId),
        roomTypeId: Number(roomTypeId),
        checkIn: checkIn || $('#checkIn').value,
        checkOut: checkOut || $('#checkOut').value,
        numRooms: 1,
        numGuests: Number($('#guests').value) || 1
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking failed');

    showToast(`Booked! Confirmation #${data.bookingId} · ₹${Math.round(data.totalAmount)}`);
    hotelModal.close();
  } catch (err) {
    showToast(err.message);
  }
}

// ---------- my bookings ----------
$('#myBookingsBtn').addEventListener('click', async () => {
  $('#modalContent').innerHTML = '<p class="muted">Loading your bookings…</p>';
  hotelModal.showModal();
  try {
    const res = await fetch(`${API_BASE}/bookings/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    $('#modalContent').innerHTML = `
      <h2>My bookings</h2>
      ${data.bookings.length === 0 ? '<p class="muted">No bookings yet.</p>' : data.bookings.map(b => `
        <div class="room-row">
          <div>
            <div class="rt-name">${b.hotel_name} — ${b.room_type_name}</div>
            <div class="rt-meta">${b.check_in} → ${b.check_out} · ${b.status}</div>
          </div>
          <span class="key-tag">₹${Math.round(b.total_amount)}</span>
        </div>
      `).join('')}
    `;
  } catch (err) {
    $('#modalContent').innerHTML = `<p class="muted">${err.message}</p>`;
  }
});

$('#closeModal').addEventListener('click', () => hotelModal.close());

// initial demo search
runSearch('Goa', $('#checkIn').value, $('#checkOut').value, $('#guests').value);
