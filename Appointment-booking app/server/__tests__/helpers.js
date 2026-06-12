const crypto = require('crypto');

/**
 * Seed standard test data into the test database.
 * All queries are async (Postgres via pg).
 */
async function seedTestData() {
  const { run } = require('../db');
  const bcrypt = require('bcryptjs');

  const password = bcrypt.hashSync('password123', 10);

  await run(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
    ['Admin User', 'admin@test.com', password, 'admin']
  );
  await run(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
    ['Test Customer', 'customer@test.com', password, 'customer']
  );
  await run(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
    ['Jane Doe', 'jane@test.com', password, 'customer']
  );

  await run(
    'INSERT INTO services (name, description, duration, price, category) VALUES ($1, $2, $3, $4, $5)',
    ['Haircut', 'Professional haircut', 30, 35.00, 'Hair']
  );
  await run(
    'INSERT INTO services (name, description, duration, price, category) VALUES ($1, $2, $3, $4, $5)',
    ['Massage', 'Relaxing massage', 60, 75.00, 'Wellness']
  );
  await run(
    'INSERT INTO services (name, description, duration, price, category) VALUES ($1, $2, $3, $4, $5)',
    ['Facial', 'Deep cleansing facial', 45, 55.00, 'Skincare']
  );

  await run(
    'INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
    [2, 1, '2026-07-15', '10:00', 'confirmed', 'First appointment']
  );
  await run(
    'INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
    [2, 2, '2026-07-20', '14:00', 'confirmed', null]
  );
  await run(
    'INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
    [3, 1, '2026-07-16', '11:00', 'confirmed', 'Jane booking']
  );
  await run(
    'INSERT INTO appointments (user_id, service_id, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
    [2, 3, '2026-06-10', '09:00', 'cancelled', 'Was cancelled']
  );
}

/**
 * Build an auth header object for supertest.
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Generate a unique test schema name for test isolation.
 */
function makeTestSchema() {
  return `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = { seedTestData, authHeader, makeTestSchema };
