/**
 * Migration 016: Business hours, holidays/blackouts, multi-location
 */
module.exports = async ({ run }) => {
  // ── Business hours (weekly schedule) ─────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS business_hours (
      id                SERIAL PRIMARY KEY,
      day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      open_time         TEXT NOT NULL,        -- HH:MM
      close_time        TEXT NOT NULL,        -- HH:MM
      is_closed         INTEGER DEFAULT 0,    -- day off
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(day_of_week)
    )
  `);

  // ── Holidays / Blackout dates ────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS business_holidays (
      id                SERIAL PRIMARY KEY,
      holiday_date      DATE NOT NULL,
      name              TEXT,                 -- e.g. "Christmas", "Staff Training"
      is_closed         INTEGER DEFAULT 1,    -- 1 = closed all day, 0 = modified hours
      open_time         TEXT,                 -- modified hours (if not closed)
      close_time        TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(holiday_date)
    )
  `);

  // ── Locations (multi-location support) ───────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS locations (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      address           TEXT,
      city              TEXT,
      state             TEXT,
      zip               TEXT,
      phone             TEXT,
      email             TEXT,
      timezone          TEXT DEFAULT 'America/New_York',
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Staff ↔ Locations junction ──────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_locations (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      location_id       INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      UNIQUE(staff_id, location_id)
    )
  `);

  // ── Appointments get location reference ─────────────────
  await run(`
    ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL
  `);

  // ── Seed default location if none exist ──────────────────
  await run(`
    INSERT INTO locations (name, address)
    SELECT COALESCE(business_name, 'Main Location'), COALESCE(business_description, '')
    FROM business_settings LIMIT 1
    WHERE NOT EXISTS (SELECT 1 FROM locations)
  `);
};
