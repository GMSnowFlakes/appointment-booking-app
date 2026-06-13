/**
 * Migration 008: Staff/Provider management with individual schedules.
 *
 * Creates:
 *   - staff_members        Staff profiles linked to users
 *   - staff_availability   Weekly recurring availability windows
 *   - staff_exceptions     Date-specific overrides (vacation, sick days)
 *   - staff_services       Junction: which services each staff member offers
 *   - staff_appointments   Junction linking appointments to staff (replaces/extends user_id)
 */
module.exports = async ({ run }) => {
  // ── Staff Members ────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_members (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      business_id       INTEGER REFERENCES business_settings(id) ON DELETE CASCADE,
      title             TEXT,                 -- e.g. "Senior Stylist", "Massage Therapist"
      bio               TEXT,
      phone             TEXT,
      color             TEXT DEFAULT '#6366f1', -- Calendar color
      is_active         INTEGER DEFAULT 1,
      max_daily_bookings INTEGER DEFAULT 0,    -- 0 = unlimited
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Staff Weekly Availability ────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_availability (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 6=Sat
      start_time        TEXT NOT NULL,        -- HH:MM
      end_time          TEXT NOT NULL,        -- HH:MM
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Staff Date Exceptions (overrides) ────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_exceptions (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      exception_date    DATE NOT NULL,
      start_time        TEXT,                 -- null = full day off
      end_time          TEXT,                 -- null = full day off
      reason            TEXT,                 -- 'vacation', 'sick', 'training', 'custom'
      is_available      INTEGER DEFAULT 0,    -- 0 = unavailable, 1 = available (override)
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(staff_id, exception_date)
    )
  `);

  // ── Staff ↔ Services Junction ────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_services (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      custom_duration   INTEGER,             -- override service duration in minutes
      custom_price      REAL,                -- override price
      is_active         INTEGER DEFAULT 1,
      UNIQUE(staff_id, service_id)
    )
  `);

  // ── Link appointments to staff ───────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_appointments (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(appointment_id, staff_id)
    )
  `);

  // ── Add staff_id column to appointments (nullable, direct ref) ─
  await run(`
    ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff_members(id) ON DELETE SET NULL
  `);
};
