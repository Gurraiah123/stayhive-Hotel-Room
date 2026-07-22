# StayHive — a budget hotel-booking clone (OYO-style)

A minimal but complete 3-tier app: static HTML/CSS/JS frontend, an
Express REST API, and a MySQL schema with sample data — the same
overall shape as a real budget-hotel booking platform (search →
hotel detail → room selection → booking → account).

This is original code built to demonstrate the architecture; it is
**not** OYO's actual codebase (which is private and copyrighted).

## Structure
```
oyo-clone/
├── database/
│   └── schema.sql        # tables + sample data
├── backend/
│   ├── server.js          # Express entry point
│   ├── db.js               # MySQL connection pool
│   ├── middleware/auth.js  # JWT auth guard
│   ├── routes/auth.js      # signup/login
│   ├── routes/hotels.js    # search/detail/availability
│   ├── routes/bookings.js  # create/list/cancel bookings
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## How the pieces fit together
- **Database**: `users`, `cities`, `hotels`, `room_types`,
  `room_availability` (per-date inventory), `bookings`, `reviews`.
  `room_availability` is the key table — it's what a real system
  uses to know whether a room type is sellable on a given night.
- **Backend**: Express REST API. Booking creation runs inside a
  SQL transaction with `FOR UPDATE` row locking so two people can't
  double-book the last room.
- **Frontend**: plain JS (no framework) calling the API with
  `fetch`. Auth token is stored in `localStorage` and sent as a
  Bearer token.

## Run it locally

1. **Database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env   # fill in your DB password + a JWT secret
   npm start              # runs on http://localhost:5000
   ```

3. **Frontend**
   Just open `frontend/index.html` in a browser, or serve it:
   ```bash
   cd frontend
   npx serve .            # or: python3 -m http.server 8080
   ```
   The frontend calls `http://localhost:5000/api` — update
   `API_BASE` in `script.js` if you host the backend elsewhere.

## API endpoints
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Log in, get JWT |
| GET | /api/hotels/search?city=&checkIn=&checkOut=&guests= | Search hotels |
| GET | /api/hotels/:id | Hotel detail + room types + reviews |
| GET | /api/hotels/:id/availability | Check date-range availability |
| POST | /api/bookings | Create a booking (auth required) |
| GET | /api/bookings/me | List my bookings (auth required) |
| PATCH | /api/bookings/:id/cancel | Cancel a booking (auth required) |

## Where a real production system goes further
- Payments (Razorpay/Stripe integration, refund handling)
- Dynamic/surge pricing engine, not just per-date overrides
- Search relevance ranking, geo search, filters (price, amenities)
- Image storage/CDN, admin dashboard for partners
- Rate limiting, input validation library (e.g. Zod/Joi), logging/monitoring
- Horizontal scaling: read replicas, caching layer (Redis) for search
