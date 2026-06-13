/**
 * Migration 011: Video conferencing (Zoom / Google Meet) auto-link generation.
 *
 * Creates:
 *   - video_meetings    Tracks video conference links per appointment
 */
module.exports = async ({ run }) => {
  await run(`
    CREATE TABLE IF NOT EXISTS video_meetings (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      provider          TEXT NOT NULL,        -- 'zoom' | 'google_meet' | 'custom'
      meeting_url       TEXT NOT NULL,
      meeting_id        TEXT,                 -- Zoom meeting ID / Meet code
      passcode          TEXT,                 -- Optional passcode
      host_token        TEXT,                 -- Encrypted token for host controls
      start_url         TEXT,                 -- Zoom host start URL
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS video_url TEXT
  `);
};
