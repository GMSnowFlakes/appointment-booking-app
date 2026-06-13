/**
 * Migration 026: Admin, Security, Integrations & AI features
 * 2FA, login history, API keys, social login, POS integration, AI prediction
 */
module.exports = async ({ run }) => {
  // ── Login history ──────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS login_history (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address        TEXT,
      user_agent        TEXT,
      login_method      TEXT DEFAULT 'password', -- password, google, facebook, magic_link
      success           INTEGER DEFAULT 0,
      failure_reason    TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── User sessions (active session tracking) ────────────
  await run(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash        TEXT NOT NULL UNIQUE,
      ip_address        TEXT,
      user_agent        TEXT,
      is_active         INTEGER DEFAULT 1,
      last_activity_at  TIMESTAMP DEFAULT NOW(),
      expires_at        TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Two-factor authentication ──────────────────────────
  await run(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_factor_secret TEXT
  `);
  await run(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_factor_enabled INTEGER DEFAULT 0
  `);

  // ── Social login / OAuth accounts ──────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider          TEXT NOT NULL,           -- 'google', 'facebook', 'apple'
      provider_id       TEXT NOT NULL,
      email             TEXT,
      avatar_url        TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(provider, provider_id)
    )
  `);

  // ── Developer API keys ─────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      key_hash          TEXT NOT NULL UNIQUE,
      key_prefix        TEXT NOT NULL,            -- first 8 chars for identification
      permissions       TEXT[] DEFAULT '{}',      -- array of permission scopes
      is_active         INTEGER DEFAULT 1,
      last_used_at      TIMESTAMP,
      expires_at        TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── IP whitelist ──────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS ip_whitelist (
      id                SERIAL PRIMARY KEY,
      ip_address        TEXT NOT NULL,
      label             TEXT,
      created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(ip_address)
    )
  `);

  // ── Integration settings ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS integration_settings (
      id                SERIAL PRIMARY KEY,
      integration_key   TEXT NOT NULL UNIQUE,     -- 'facebook_pixel', 'google_analytics', 'square_pos', 'zapier'
      display_name      TEXT NOT NULL,
      settings          JSONB DEFAULT '{}',       -- { pixel_id: "123", api_key: "..." }
      is_enabled        INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Maintenance mode ──────────────────────────────────
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS maintenance_mode INTEGER DEFAULT 0
  `);
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS maintenance_message TEXT
  `);

  // ── White-label settings ───────────────────────────────
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS white_label_enabled INTEGER DEFAULT 0
  `);
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS white_label_domain TEXT
  `);
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS custom_favicon_url TEXT
  `);

  // ── AI prediction tables ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS ai_predictions (
      id                SERIAL PRIMARY KEY,
      prediction_type   TEXT NOT NULL,            -- 'no_show', 'demand_forecast', 'dynamic_price'
      entity_type       TEXT,                     -- 'appointment', 'service', 'staff'
      entity_id         INTEGER,
      prediction_data   JSONB,                    -- { probability: 0.85, factors: [...] }
      confidence        REAL,
      created_at        TIMESTAMP DEFAULT NOW(),
      expires_at        TIMESTAMP
    )
  `);

  // ── Role permissions customization ────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id                SERIAL PRIMARY KEY,
      role              TEXT NOT NULL UNIQUE,     -- 'admin', 'receptionist', 'staff', 'customer'
      permissions       JSONB NOT NULL DEFAULT '{}', -- { 'appointments:read': true, 'appointments:write': false }
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // -- Seed default receptionist role
  await run(`
    INSERT INTO role_permissions (role, permissions)
    VALUES ('receptionist', '{
      "appointments:read": true,
      "appointments:write": true,
      "appointments:cancel": true,
      "customers:read": true,
      "customers:write": true,
      "services:read": true,
      "services:write": false,
      "staff:read": true,
      "staff:write": false,
      "reports:read": true,
      "settings:read": false,
      "settings:write": false,
      "admin:access": false
    }')
    ON CONFLICT (role) DO NOTHING
  `);

  // ── Expense tracking per service ───────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS service_expenses (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      amount_cents      INTEGER NOT NULL,
      expense_type      TEXT DEFAULT 'supplies', -- supplies, labor, equipment, marketing, other
      recurring         INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── iCal export tokens ────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS ical_tokens (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token             TEXT NOT NULL UNIQUE,
      calendar_type     TEXT DEFAULT 'appointments',
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Multi-currency support ─────────────────────────────
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'
  `);
  await run(`
    ALTER TABLE business_settings
      ADD COLUMN IF NOT EXISTS available_currencies TEXT[] DEFAULT '{USD}'
  `);

  // ── Public booking page settings ──────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS public_booking_pages (
      id                SERIAL PRIMARY KEY,
      slug              TEXT NOT NULL UNIQUE,
      is_active         INTEGER DEFAULT 1,
      title             TEXT DEFAULT 'Book an Appointment',
      allowed_services  INTEGER[],
      allowed_staff     INTEGER[],
      require_auth      INTEGER DEFAULT 0,        -- if 0, guest checkout allowed
      require_phone     INTEGER DEFAULT 0,
      redirect_url      TEXT,                      -- after booking
      custom_css        TEXT,
      seo_description   TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
