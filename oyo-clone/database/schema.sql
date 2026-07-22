-- ============================================================
-- STAYHIVE (OYO-style budget hotel booking) — Database Schema
-- Works on MySQL 8+ / MariaDB. For PostgreSQL: swap AUTO_INCREMENT
-- for SERIAL and ENUM types for CHECK constraints.
-- ============================================================

DROP DATABASE IF EXISTS stayhive;
CREATE DATABASE stayhive;
USE stayhive;

-- ---------------------------------------------------
-- 1. USERS  (guests + hotel-partner admins)
-- ---------------------------------------------------
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    phone         VARCHAR(20)   NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,       -- bcrypt hash, never store plaintext
    role          ENUM('guest','partner','admin') NOT NULL DEFAULT 'guest',
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------
-- 2. CITIES  (for search/autocomplete)
-- ---------------------------------------------------
CREATE TABLE cities (
    city_id     INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    state       VARCHAR(100) NOT NULL,
    country     VARCHAR(100) NOT NULL DEFAULT 'India'
);

-- ---------------------------------------------------
-- 3. HOTELS (properties)
-- ---------------------------------------------------
CREATE TABLE hotels (
    hotel_id      INT AUTO_INCREMENT PRIMARY KEY,
    partner_id    INT NOT NULL,                 -- owner/admin user
    city_id       INT NOT NULL,
    name          VARCHAR(160) NOT NULL,
    address       VARCHAR(255) NOT NULL,
    description   TEXT,
    star_rating   TINYINT CHECK (star_rating BETWEEN 1 AND 5),
    guest_rating  DECIMAL(2,1) DEFAULT 0.0,      -- e.g. 4.3 out of 5
    amenities     JSON,                          -- ["WiFi","AC","Breakfast","Parking"]
    cover_image   VARCHAR(255),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES users(user_id),
    FOREIGN KEY (city_id) REFERENCES cities(city_id)
);

-- ---------------------------------------------------
-- 4. ROOM TYPES  (inventory per hotel)
-- ---------------------------------------------------
CREATE TABLE room_types (
    room_type_id   INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id       INT NOT NULL,
    name           VARCHAR(100) NOT NULL,        -- e.g. "Deluxe AC Room"
    base_price     DECIMAL(10,2) NOT NULL,
    max_occupancy  TINYINT NOT NULL DEFAULT 2,
    total_rooms    INT NOT NULL DEFAULT 1,        -- how many of this type exist
    refundable     BOOLEAN DEFAULT TRUE,
    breakfast_incl BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id)
);

-- ---------------------------------------------------
-- 5. ROOM INVENTORY / AVAILABILITY (per date, per room type)
--    This is the table that actually powers "is this room free
--    on this date" checks — a simplified version of what a real
--    channel-manager / inventory system does.
-- ---------------------------------------------------
CREATE TABLE room_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id     INT NOT NULL,
    stay_date        DATE NOT NULL,
    rooms_available  INT NOT NULL,
    price_override   DECIMAL(10,2) NULL,          -- dynamic pricing for that date
    UNIQUE KEY uniq_room_date (room_type_id, stay_date),
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id)
);

-- ---------------------------------------------------
-- 6. BOOKINGS
-- ---------------------------------------------------
CREATE TABLE bookings (
    booking_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    hotel_id        INT NOT NULL,
    room_type_id    INT NOT NULL,
    check_in        DATE NOT NULL,
    check_out       DATE NOT NULL,
    num_rooms       INT NOT NULL DEFAULT 1,
    num_guests      INT NOT NULL DEFAULT 1,
    total_amount    DECIMAL(10,2) NOT NULL,
    status          ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
    payment_status  ENUM('unpaid','paid','refunded') DEFAULT 'unpaid',
    booked_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id)
);

-- ---------------------------------------------------
-- 7. REVIEWS
-- ---------------------------------------------------
CREATE TABLE reviews (
    review_id    INT AUTO_INCREMENT PRIMARY KEY,
    booking_id   INT NOT NULL,
    hotel_id     INT NOT NULL,
    user_id      INT NOT NULL,
    rating       TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('Rahul Sharma',   'rahul.sharma@example.com',  '9876543210', '$2b$10$hashplaceholder1', 'guest'),
('Priya Nair',      'priya.nair@example.com',    '9876500011', '$2b$10$hashplaceholder2', 'guest'),
('Ankit Verma',     'ankit.partner@example.com', '9876500022', '$2b$10$hashplaceholder3', 'partner'),
('Sunita Rao',      'sunita.partner@example.com','9876500033', '$2b$10$hashplaceholder4', 'partner'),
('Admin User',      'admin@stayhive.com',        '9999999999', '$2b$10$hashplaceholder5', 'admin');

INSERT INTO cities (name, state, country) VALUES
('Bengaluru', 'Karnataka', 'India'),
('Goa',       'Goa',       'India'),
('Jaipur',    'Rajasthan', 'India'),
('Mumbai',    'Maharashtra','India');

INSERT INTO hotels (partner_id, city_id, name, address, description, star_rating, guest_rating, amenities, cover_image) VALUES
(3, 1, 'StayHive Indiranagar Central', '100 Ft Road, Indiranagar, Bengaluru',
 'Budget-friendly rooms near Bengaluru''s nightlife and cafe strip.', 3, 4.2,
 '["WiFi","AC","Breakfast","Parking","24x7 Front Desk"]', 'hotel_blr_1.jpg'),

(3, 2, 'StayHive Calangute Beachside', 'Beach Road, Calangute, Goa',
 'Steps from Calangute beach, ideal for weekend getaways.', 3, 4.5,
 '["WiFi","AC","Pool","Breakfast","Bar"]', 'hotel_goa_1.jpg'),

(4, 3, 'StayHive Pink City Heritage', 'MI Road, Jaipur',
 'Heritage-style budget stay minutes from Hawa Mahal.', 2, 3.9,
 '["WiFi","AC","Parking","Rooftop Cafe"]', 'hotel_jaipur_1.jpg'),

(4, 4, 'StayHive Andheri Business Stay', 'Andheri East, Mumbai',
 'Convenient for business travellers near the airport.', 3, 4.1,
 '["WiFi","AC","Breakfast","Airport Shuttle","Work Desk"]', 'hotel_mumbai_1.jpg');

INSERT INTO room_types (hotel_id, name, base_price, max_occupancy, total_rooms, refundable, breakfast_incl) VALUES
(1, 'Standard Room',     1299.00, 2, 10, TRUE,  FALSE),
(1, 'Deluxe AC Room',    1799.00, 3, 6,  TRUE,  TRUE),
(2, 'Sea View Deluxe',   2999.00, 2, 8,  TRUE,  TRUE),
(2, 'Standard Room',     2199.00, 2, 12, FALSE, FALSE),
(3, 'Heritage Single',   999.00,  1, 5,  TRUE,  FALSE),
(3, 'Heritage Double',   1399.00, 2, 8,  TRUE,  TRUE),
(4, 'Business Suite',    2499.00, 2, 4,  TRUE,  TRUE),
(4, 'Standard Room',     1599.00, 2, 10, TRUE,  FALSE);

-- Sample availability for a handful of upcoming dates
INSERT INTO room_availability (room_type_id, stay_date, rooms_available) VALUES
(1, '2026-08-01', 10), (1, '2026-08-02', 9),
(2, '2026-08-01', 6),  (2, '2026-08-02', 6),
(3, '2026-08-01', 5),  (3, '2026-08-02', 4),
(4, '2026-08-01', 12), (4, '2026-08-02', 12),
(5, '2026-08-01', 5),  (5, '2026-08-02', 5),
(6, '2026-08-01', 8),  (6, '2026-08-02', 7),
(7, '2026-08-01', 4),  (7, '2026-08-02', 3),
(8, '2026-08-01', 10), (8, '2026-08-02', 10);

INSERT INTO bookings (user_id, hotel_id, room_type_id, check_in, check_out, num_rooms, num_guests, total_amount, status, payment_status) VALUES
(1, 1, 2, '2026-07-10', '2026-07-12', 1, 2, 3598.00, 'completed', 'paid'),
(2, 2, 3, '2026-07-15', '2026-07-17', 1, 2, 5998.00, 'completed', 'paid'),
(1, 4, 7, '2026-08-01', '2026-08-02', 1, 2, 2499.00, 'confirmed', 'paid');

INSERT INTO reviews (booking_id, hotel_id, user_id, rating, comment) VALUES
(1, 1, 1, 4, 'Clean room, great location near the cafes. AC worked well.'),
(2, 2, 2, 5, 'Loved waking up to the sea view. Staff were very helpful.');
