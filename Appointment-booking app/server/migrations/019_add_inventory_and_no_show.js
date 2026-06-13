/**
 * Migration 019: Inventory/product add-ons, no-show fees, late cancellation
 */
module.exports = async ({ run }) => {
  // ── No-show / late cancellation policy settings ─────────
  await run(`
    CREATE TABLE IF NOT EXISTS cancellation_policies (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,         -- e.g. "Standard", "Strict", "Flexible"
      cancel_window_hours INTEGER DEFAULT 24, -- hours before appointment
      cancel_fee_percent REAL DEFAULT 0,      -- % of service price charged
      no_show_fee_percent REAL DEFAULT 100,   -- % charged for no-show
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS no_show_fees (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fee_cents         INTEGER NOT NULL,
      fee_type          TEXT NOT NULL,         -- 'late_cancel', 'no_show'
      status            TEXT DEFAULT 'pending', -- pending, paid, waived
      payment_intent_id INTEGER REFERENCES payment_intents(id) ON DELETE SET NULL,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Inventory / products ────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      price_cents       INTEGER NOT NULL,
      cost_cents        INTEGER DEFAULT 0,    -- for profit tracking
      stock             INTEGER DEFAULT 0,    -- 0 = unlimited
      sku               TEXT UNIQUE,
      category          TEXT,
      image_url         TEXT,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Link products to services (add-ons at booking) ──────
  await run(`
    CREATE TABLE IF NOT EXISTS service_products (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      is_required       INTEGER DEFAULT 0,
      quantity_default  INTEGER DEFAULT 1,
      UNIQUE(service_id, product_id)
    )
  `);

  // ── Products added to appointments ──────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS appointment_products (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity          INTEGER DEFAULT 1,
      price_cents       INTEGER NOT NULL,     -- price at time of purchase
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
