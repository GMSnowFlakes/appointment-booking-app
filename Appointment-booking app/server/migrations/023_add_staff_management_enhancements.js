/**
 * Migration 023: Staff Management enhancements
 * Time-off requests, shifts, clock-in/out, breaks, portfolio, certifications
 */
module.exports = async ({ run }) => {
  // ── Staff time-off / leave requests ────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_leave_requests (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      leave_type        TEXT NOT NULL,           -- 'vacation', 'sick', 'personal', 'other'
      start_date        DATE NOT NULL,
      end_date          DATE NOT NULL,
      reason            TEXT,
      status            TEXT DEFAULT 'pending',  -- pending, approved, denied, cancelled
      approved_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Shift scheduling ──────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_shifts (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      shift_date        DATE NOT NULL,
      start_time        TEXT NOT NULL,           -- HH:MM
      end_time          TEXT NOT NULL,           -- HH:MM
      shift_type        TEXT DEFAULT 'regular',  -- regular, training, meeting, on_call
      notes             TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(staff_id, shift_date)
    )
  `);

  // ── Staff clock-in / clock-out ─────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_clock_entries (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      clock_in          TIMESTAMP NOT NULL,
      clock_out         TIMESTAMP,
      duration_minutes  INTEGER,                 -- calculated on clock-out
      appointment_id    INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      notes             TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Staff break tracking ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_breaks (
      id                SERIAL PRIMARY KEY,
      clock_entry_id    INTEGER NOT NULL REFERENCES staff_clock_entries(id) ON DELETE CASCADE,
      break_start       TIMESTAMP NOT NULL,
      break_end         TIMESTAMP,
      break_type        TEXT DEFAULT 'lunch',    -- lunch, break, personal
      duration_minutes  INTEGER                  -- calculated on end
    )
  `);

  // ── Staff portfolio / lookbook ─────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_portfolio_items (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      title             TEXT,
      description       TEXT,
      image_url         TEXT NOT NULL,
      category          TEXT,                    -- before/after, work_sample, style
      is_featured       INTEGER DEFAULT 0,
      sort_order        INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Staff certifications ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_certifications (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,           -- e.g. "Cosmetology License"
      issuer            TEXT,                    -- e.g. "State Board of Cosmetology"
      credential_id     TEXT,                    -- license number
      issue_date        DATE,
      expiry_date       DATE,
      file_url          TEXT,                    -- uploaded certificate
      is_verified       INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Staff document storage ─────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS staff_documents (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      file_url          TEXT NOT NULL,
      document_type     TEXT DEFAULT 'other',    -- contract, w9, id, certification, other
      notes             TEXT,
      uploaded_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Buffer time settings ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS buffer_settings (
      id                SERIAL PRIMARY KEY,
      staff_id          INTEGER REFERENCES staff_members(id) ON DELETE CASCADE, -- null = global
      before_minutes    INTEGER DEFAULT 0,       -- buffer before appointment
      after_minutes     INTEGER DEFAULT 0,       -- buffer after appointment
      applies_to        TEXT DEFAULT 'all',       -- all, first_booking, last_booking
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
