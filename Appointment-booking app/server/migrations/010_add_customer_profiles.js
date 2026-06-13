/**
 * Migration 010: Customer booking history and profile enhancements.
 *
 * Creates:
 *   - customer_profiles   Extended profile data per user
 *   - review               Service reviews by customers
 */
module.exports = async ({ run }) => {
  // ── Customer Profiles ────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      phone             TEXT,
      birthday          DATE,
      notes             TEXT,                 -- staff notes about customer
      total_visits      INTEGER DEFAULT 0,
      total_spent_cents  INTEGER DEFAULT 0,
      preferred_staff_id INTEGER REFERENCES staff_members(id) ON DELETE SET NULL,
      tags              TEXT[] DEFAULT '{}',  -- e.g. {'vip', 'allergic', 'new-customer'}
      metadata          JSONB DEFAULT '{}',
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Reviews ──────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      staff_id          INTEGER REFERENCES staff_members(id) ON DELETE SET NULL,
      rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title             TEXT,
      comment           TEXT,
      is_approved       INTEGER DEFAULT 0,    -- admin moderation
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
