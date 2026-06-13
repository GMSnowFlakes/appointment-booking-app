/**
 * Migration 009: Waiting list for fully booked slots.
 *
 * Creates:
 *   - waiting_list     Tracks customers waiting for available slots
 */
module.exports = async ({ run }) => {
  await run(`
    CREATE TABLE IF NOT EXISTS waiting_list (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      staff_id          INTEGER REFERENCES staff_members(id) ON DELETE CASCADE,
      preferred_date    DATE,                 -- null = any date
      preferred_time_from TEXT,               -- HH:MM, null = any time
      preferred_time_to   TEXT,               -- HH:MM, null = any time
      status            TEXT NOT NULL DEFAULT 'waiting',
                        -- waiting, notified, booked, expired, cancelled
      notified_at       TIMESTAMP,
      expires_at        TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  -- Index for efficient lookup when a slot opens up
  await run(`
    CREATE INDEX IF NOT EXISTS idx_waiting_list_status
      ON waiting_list(status, service_id, staff_id)
  `);
};
