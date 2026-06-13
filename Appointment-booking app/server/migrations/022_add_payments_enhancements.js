/**
 * Migration 022: Payments & Finance enhancements
 * Tax config, dynamic pricing, prepaid credits, tips, buy now pay later
 */
module.exports = async ({ run }) => {
  // ── Tax configuration per service ───────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS tax_rates (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,           -- e.g. "Sales Tax 8%"
      rate_percent      REAL NOT NULL,           -- e.g. 8.00
      tax_type          TEXT DEFAULT 'inclusive', -- inclusive, exclusive
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS service_tax_rates (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      tax_rate_id       INTEGER NOT NULL REFERENCES tax_rates(id) ON DELETE CASCADE,
      UNIQUE(service_id, tax_rate_id)
    )
  `);

  // ── Dynamic pricing rules ──────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER REFERENCES services(id) ON DELETE CASCADE, -- null = all services
      rule_type         TEXT NOT NULL,           -- 'peak_hours', 'weekend', 'seasonal', 'holiday'
      days_of_week      INTEGER[],              -- [0,6] = weekend, null = any
      start_time        TEXT,                   -- HH:MM for peak hours
      end_time          TEXT,                   -- HH:MM for peak hours
      start_date        DATE,                   -- for seasonal
      end_date          DATE,                   -- for seasonal
      adjustment_type   TEXT NOT NULL,           -- 'multiplier', 'fixed_add', 'fixed_subtract'
      adjustment_value  REAL NOT NULL,          -- 1.5 = 50% more, 10 = $10 added
      priority          INTEGER DEFAULT 0,      -- higher = overrides lower
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Early bird discounts ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS early_bird_discounts (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER REFERENCES services(id) ON DELETE CASCADE, -- null = all
      days_before       INTEGER NOT NULL,        -- book at least X days in advance
      discount_percent  REAL NOT NULL,
      max_discount_cents INTEGER,                -- cap in cents
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Last-minute deal slots ─────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS last_minute_deals (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      hours_before      INTEGER NOT NULL,        -- within X hours of appointment
      discount_percent  REAL NOT NULL,
      max_quantity      INTEGER DEFAULT 0,       -- 0 = unlimited
      current_used      INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Prepaid credit system ──────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS user_credits (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      balance_cents     INTEGER DEFAULT 0,
      lifetime_credits  INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents      INTEGER NOT NULL,        -- positive = added, negative = spent
      type              TEXT NOT NULL,           -- 'purchase', 'booking', 'refund', 'bonus', 'expired'
      reference_type    TEXT,                    -- 'appointment', 'gift_card', 'promotion'
      reference_id      INTEGER,
      description       TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Tip settings ───────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS tip_settings (
      id                SERIAL PRIMARY KEY,
      is_enabled        INTEGER DEFAULT 1,
      default_percentages INTEGER[] DEFAULT '{15,18,20,25}',
      custom_enabled    INTEGER DEFAULT 1,
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Buy now pay later providers ─────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS bnpl_providers (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,           -- 'klarna', 'afterpay', 'affirm'
      is_active         INTEGER DEFAULT 0,
      min_amount_cents  INTEGER DEFAULT 0,
      max_amount_cents  INTEGER,
      api_key           TEXT,
      api_secret        TEXT,
      environment       TEXT DEFAULT 'sandbox',  -- sandbox, production
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Add tax and tip columns to invoices ─────────────────
  await run(`
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS tax_rate_id INTEGER REFERENCES tax_rates(id) ON DELETE SET NULL
  `);
};
