/**
 * Migration 015: Recurring appointments + package/bundle deals
 */
module.exports = async ({ run }) => {
  // ── Recurring appointments ──────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS recurring_series (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      staff_id          INTEGER REFERENCES staff_members(id) ON DELETE SET NULL,
      frequency         TEXT NOT NULL,        -- 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
      interval          INTEGER DEFAULT 1,   -- every X days/weeks/months
      days_of_week      INTEGER[],           -- for weekly: [1,3,5] = Mon/Wed/Fri
      start_date        DATE NOT NULL,
      end_date          DATE,
      time              TEXT NOT NULL,        -- HH:MM
      total_occurrences INTEGER DEFAULT 0,
      occurrences_booked INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Package / bundle deals ──────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS packages (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      session_count     INTEGER NOT NULL,     -- e.g. 5 sessions
      original_price_cents INTEGER NOT NULL,
      package_price_cents  INTEGER NOT NULL,
      savings_percent   REAL GENERATED ALWAYS AS (
        CAST(ROUND((1 - package_price_cents::REAL / NULLIF(original_price_cents, 0)) * 100) AS REAL)
      ) STORED,
      is_active         INTEGER DEFAULT 1,
      expires_days      INTEGER,             -- days until package expires
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── User purchased packages ─────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS user_packages (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id        INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      sessions_used     INTEGER DEFAULT 0,
      sessions_total    INTEGER NOT NULL,
      payment_intent_id INTEGER REFERENCES payment_intents(id) ON DELETE SET NULL,
      expires_at        TIMESTAMP,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Track which appointments use package sessions ────────
  await run(`
    CREATE TABLE IF NOT EXISTS appointment_packages (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      user_package_id   INTEGER NOT NULL REFERENCES user_packages(id) ON DELETE CASCADE,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
