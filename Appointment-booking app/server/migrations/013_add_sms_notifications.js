/**
 * Migration 013: SMS notifications via Twilio.
 *
 * Creates:
 *   - sms_preferences   Per-user SMS opt-in/out + phone number
 *   - sms_log           Audit log of sent SMS messages
 */
module.exports = async ({ run }) => {
  // ── SMS Preferences ──────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS sms_preferences (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      phone             TEXT,
      phone_verified    INTEGER DEFAULT 0,
      sms_reminders     INTEGER DEFAULT 1,    -- opt-in for reminder SMS
      sms_confirmation  INTEGER DEFAULT 1,    -- opt-in for booking confirmation SMS
      sms_cancellation  INTEGER DEFAULT 1,    -- opt-in for cancellation SMS
      sms_reschedule    INTEGER DEFAULT 1,    -- opt-in for reschedule SMS
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── SMS Log ──────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS sms_log (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
      appointment_id    INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
      to_phone          TEXT NOT NULL,
      message_type      TEXT NOT NULL,        -- 'reminder', 'confirmation', 'cancellation', 'reschedule', 'status_change'
      body              TEXT NOT NULL,
      twilio_sid        TEXT,                 -- Twilio message SID
      status            TEXT DEFAULT 'sent',  -- sent, delivered, failed, bounced
      error_message     TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
