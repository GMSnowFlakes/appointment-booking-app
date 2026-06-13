/**
 * Migration 024: Customer Management & Scheduling enhancements
 * Blacklist, booking rules, group bookings, walk-ins, email campaigns
 */
module.exports = async ({ run }) => {
  // ── Customer blacklist / block list ────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS customer_blacklist (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      reason            TEXT NOT NULL,
      blocked_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      blocked_at        TIMESTAMP DEFAULT NOW(),
      expires_at        TIMESTAMP,
      is_active         INTEGER DEFAULT 1
    )
  `);

  // ── Customer tags (flexible tagging) ───────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS customer_tags (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tag               TEXT NOT NULL,
      created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, tag)
    )
  `);

  // ── Booking rules (global and per-service) ─────────────
  await run(`
    CREATE TABLE IF NOT EXISTS booking_rules (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER REFERENCES services(id) ON DELETE CASCADE, -- null = global
      min_advance_hours INTEGER DEFAULT 0,        -- 0 = no minimum
      max_advance_days  INTEGER DEFAULT 365,      -- max days in advance
      allow_same_day    INTEGER DEFAULT 1,
      max_per_customer_per_day INTEGER DEFAULT 0, -- 0 = unlimited
      min_gap_hours_same_service INTEGER DEFAULT 0, -- minimum hours before rebooking
      max_reschedules   INTEGER DEFAULT 0,        -- 0 = unlimited
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Group / class bookings ─────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS group_bookings (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      staff_id          INTEGER REFERENCES staff_members(id) ON DELETE SET NULL,
      title             TEXT NOT NULL,
      description       TEXT,
      date              DATE NOT NULL,
      time              TEXT NOT NULL,            -- HH:MM
      duration          INTEGER NOT NULL,         -- minutes
      max_capacity      INTEGER NOT NULL,
      current_bookings  INTEGER DEFAULT 0,
      price_cents       INTEGER NOT NULL,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS group_booking_attendees (
      id                SERIAL PRIMARY KEY,
      group_booking_id  INTEGER NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status            TEXT DEFAULT 'confirmed', -- confirmed, cancelled, attended
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(group_booking_id, user_id)
    )
  `);

  // ── Walk-in token system ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS walk_in_tokens (
      id                SERIAL PRIMARY KEY,
      token_number      INTEGER NOT NULL,
      service_id        INTEGER REFERENCES services(id) ON DELETE SET NULL,
      customer_name     TEXT,
      customer_phone    TEXT,
      party_size        INTEGER DEFAULT 1,
      status            TEXT DEFAULT 'waiting',   -- waiting, in_progress, completed, cancelled, no_show
      estimated_wait_minutes INTEGER,
      checked_in_at     TIMESTAMP DEFAULT NOW(),
      started_at        TIMESTAMP,
      completed_at      TIMESTAMP,
      appointment_id    INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Email campaign / abandoned booking recovery ───────
  await run(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      campaign_type     TEXT NOT NULL,           -- 'abandoned_booking', 're_engagement', 'upsell', 'birthday', 'follow_up'
      subject           TEXT NOT NULL,
      body_html         TEXT,
      body_text         TEXT,
      trigger_event     TEXT,                    -- appointment.created, no_booking_30d, etc.
      delay_hours       INTEGER DEFAULT 0,       -- hours after trigger
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS campaign_log (
      id                SERIAL PRIMARY KEY,
      campaign_id       INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sent_at           TIMESTAMP DEFAULT NOW(),
      opened_at         TIMESTAMP,
      clicked_at        TIMESTAMP,
      status            TEXT DEFAULT 'sent'      -- sent, delivered, opened, clicked, bounced
    )
  `);

  // ── Abandoned booking recovery ─────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS abandoned_bookings (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_data      JSONB,                   -- stores incomplete booking state
      service_id        INTEGER REFERENCES services(id) ON DELETE SET NULL,
      preferred_date    DATE,
      preferred_time    TEXT,
      recovery_sent     INTEGER DEFAULT 0,
      recovered         INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW(),
      recovered_at      TIMESTAMP
    )
  `);

  // ── NPS survey responses ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS nps_surveys (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score             INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
      comment           TEXT,
      category          TEXT,                    -- promoter, passive, detractor
      sent_at           TIMESTAMP,
      responded_at      TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Add advance booking columns to services for quick lookup ─
  await run(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 0
  `);
  await run(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 365
  `);
  await run(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS allow_same_day INTEGER DEFAULT 1
  `);
};
