// db.js — MySQL connection pool
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '40.192.0.73',
  user: process.env.DB_USER || 'stayhive',
  password: process.env.DB_PASSWORD || 'StayHive@123',
  database: process.env.DB_NAME || 'stayhive',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
