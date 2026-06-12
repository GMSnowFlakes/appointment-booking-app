const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Seed standard test data into the test database.
 * Requires db module dynamically to pick up the current test DB path.
 */
function seedTestData() {
  const { run } = require('../db');
  const bcrypt = require('bcryptjs');

  const password = bcrypt.hashSync('password123', 10);

  run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    ['Admin User', 'admin@test.com', password, 'admin']);
  run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    ['Test Customer', 'customer@test.com', password, 'customer']);
  run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    ['Jane Doe', 'jane@test.com', password, 'customer']);

  run('INSERT INTO services (name, description, duration, price, category) VALUES (?, ?, ?, ?, ?)',
    ['Haircut', 'Professional haircut', 30, 35.00, 'Hair']);
  run('INSERT INTO services (name, description, duration, price, category) VALUES (?, ?, ?, ?, ?)',
    ['Massage', 'Relaxing massage', 60, 75.00, 'Wellness']);
  run('INSERT INTO services (name, description, duration, price, category) VALUES (?, ?, ?, ?, ?)',
    ['Facial', 'Deep cleansing facial', 45, 55.00, 'Skincare']);

  run('INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [2, 1, '2026-07-15', '10:00', 'confirmed', 'First appointment']);
  run('INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [2, 2, '2026-07-20', '14:00', 'confirmed', null]);
  run('INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [3, 1, '2026-07-16', '11:00', 'confirmed', 'Jane booking']);
  run('INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [2, 3, '2026-06-10', '09:00', 'cancelled', 'Was cancelled']);
}

/**
 * Build an auth header object for supertest
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { seedTestData, authHeader };
