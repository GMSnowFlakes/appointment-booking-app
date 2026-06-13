/**
 * Migration 020: Analytics, staff commissions, QR codes
 */
module.exports = async ({ run }) => {
  await run(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id                SERIAL PRIMARY KEY,
      event_type        TEXT NOT NULL,         -- 'booking', 'cancellation', 'reschedule', 'page_view', 'check_in'
      user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
      appointment_id    INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      service_id        INTEGER REFERENCES services(id) ON DELETE SET NULL,
      staff_id          INTEGER REFERENCES staff_members(id) ON DELETE SET NULL,
      metadata          JSONB DEFAULT '{}',
      ip_address        TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type, created_at)
  `);

  // ── Staff commission tracking ──────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_commissions (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      service_price_cents INTEGER NOT NULL,
      commission_type   TEXT NOT NULL,         -- 'percentage', 'fixed'
      commission_value  REAL NOT NULL,
      commission_cents  INTEGER NOT NULL,
      status            TEXT DEFAULT 'pending', -- pending, approved, paid
      paid_at           TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── QR code check-in ───────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      qr_code           TEXT NOT NULL UNIQUE,
      checked_in_at     TIMESTAMP,
      check_in_method   TEXT,                 -- 'qr_code', 'manual', 'sms'
      notes             TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
