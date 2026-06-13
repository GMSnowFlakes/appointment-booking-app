/**
 * Migration 025: Notifications, Communication & Compliance
 * Templates, push, in-app messaging, i18n, timezone, GDPR, audit
 */
module.exports = async ({ run }) => {
  // ── Email / SMS notification templates ─────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      type              TEXT NOT NULL,           -- 'email', 'sms', 'push'
      event_type        TEXT NOT NULL,           -- 'booking_confirmation', 'reminder', 'cancellation', etc.
      subject           TEXT,                    -- email subject line
      body_template     TEXT NOT NULL,           -- template with {{placeholders}}
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Web push subscriptions ─────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint          TEXT NOT NULL UNIQUE,
      p256dh_key        TEXT NOT NULL,
      auth_key          TEXT NOT NULL,
      device_type       TEXT DEFAULT 'web',      -- web, ios, android
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── In-app messaging ───────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id                SERIAL PRIMARY KEY,
      subject           TEXT,
      created_by        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id                SERIAL PRIMARY KEY,
      conversation_id   INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at      TIMESTAMP,
      is_admin          INTEGER DEFAULT 0,
      UNIQUE(conversation_id, user_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id                SERIAL PRIMARY KEY,
      conversation_id   INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content           TEXT NOT NULL,
      message_type      TEXT DEFAULT 'text',     -- text, image, file, system
      file_url          TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Multi-language / i18n support ──────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS supported_languages (
      id                SERIAL PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,    -- 'en', 'es', 'fr', 'de', etc.
      name              TEXT NOT NULL,           -- 'English', 'Español', etc.
      is_default        INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS translations (
      id                SERIAL PRIMARY KEY,
      language_code     TEXT NOT NULL REFERENCES supported_languages(code) ON DELETE CASCADE,
      key               TEXT NOT NULL,           -- 'booking.title', 'email.greeting', etc.
      value             TEXT NOT NULL,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(language_code, key)
    )
  `);

  await run(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'
  `);

  // ── Timezone support ───────────────────────────────────
  await run(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC'
  `);

  // ── GDPR compliance ────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS gdpr_requests (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_type      TEXT NOT NULL,           -- 'data_export', 'erasure', 'rectification'
      status            TEXT DEFAULT 'pending',  -- pending, processing, completed, rejected
      requested_at      TIMESTAMP DEFAULT NOW(),
      completed_at      TIMESTAMP,
      notes             TEXT
    )
  `);

  // ── Audit log (comprehensive) ─────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action            TEXT NOT NULL,           -- 'user.login', 'appointment.create', 'admin.delete', etc.
      entity_type       TEXT,                    -- 'user', 'appointment', 'service', etc.
      entity_id         INTEGER,
      details           JSONB,
      ip_address        TEXT,
      user_agent        TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at)
  `);
  await run(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at)
  `);
};
