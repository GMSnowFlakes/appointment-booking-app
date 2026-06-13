/**
 * Migration 012: Google Calendar sync for appointments.
 *
 * Creates:
 *   - calendar_tokens    Stores OAuth tokens per user for Google Calendar access
 *   - calendar_events    Tracks synced Google Calendar event IDs per appointment
 */
module.exports = async ({ run }) => {
  // ── Calendar OAuth Tokens ────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS calendar_tokens (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      access_token      TEXT NOT NULL,
      refresh_token     TEXT,
      token_type        TEXT DEFAULT 'Bearer',
      scope             TEXT,
      expiry_date       TIMESTAMP,
      calendar_id       TEXT DEFAULT 'primary',
      sync_enabled      INTEGER DEFAULT 1,
      last_synced_at    TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Synced Calendar Events ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      google_event_id   TEXT NOT NULL,
      calendar_id       TEXT DEFAULT 'primary',
      status            TEXT DEFAULT 'confirmed',  -- confirmed, tentative, cancelled
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(appointment_id, user_id, calendar_id)
    )
  `);
};
