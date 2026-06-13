/**
 * Migration 007: Add payments (Stripe/PayPal) and coupon/discount tables.
 *
 * Creates:
 *   - payment_intents   Tracks Stripe PaymentIntents per appointment
 *   - refunds           Tracks refunds issued against payments
 *   - coupons           Discount codes with usage limits/expiry
 *   - appointment_coupons  Bridge table linking appointments to applied coupons
 */
module.exports = async ({ run }) => {
  // ── Payment Intents ──────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_pi_id      TEXT UNIQUE,          -- Stripe PaymentIntent ID (null for PayPal)
      paypal_order_id   TEXT UNIQUE,          -- PayPal Order ID (null for Stripe)
      amount            INTEGER NOT NULL,     -- amount in cents
      currency          TEXT NOT NULL DEFAULT 'usd',
      status            TEXT NOT NULL DEFAULT 'requires_payment_method',
                      -- possible: requires_payment_method, requires_confirmation,
                      -- processing, succeeded, failed, canceled, refunded, partially_refunded
      deposit_amount    INTEGER DEFAULT 0,    -- deposit collected in cents (0 = full payment)
      deposit_refunded  INTEGER DEFAULT 0,    -- whether deposit was refunded
      metadata          JSONB DEFAULT '{}',
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Refunds ──────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS refunds (
      id                SERIAL PRIMARY KEY,
      payment_intent_id INTEGER NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
      stripe_re_id      TEXT,                 -- Stripe Refund ID
      amount            INTEGER NOT NULL,     -- refund amount in cents
      reason            TEXT,                 -- 'deposit' | 'full' | 'partial' | 'coupon_adjustment'
      status            TEXT NOT NULL DEFAULT 'pending',
                      -- pending, succeeded, failed
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Coupons / Discount Codes ─────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id                SERIAL PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,
      description       TEXT,
      discount_type     TEXT NOT NULL,        -- 'percentage' | 'fixed_amount'
      discount_value    REAL NOT NULL,        -- percentage (1-100) or amount in dollars
      min_appointment_amount INTEGER DEFAULT 0, -- minimum cart total in cents to apply
      max_uses          INTEGER DEFAULT 0,    -- 0 = unlimited
      max_uses_per_user INTEGER DEFAULT 1,    -- 0 = unlimited per user
      current_uses      INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1,
      valid_from        TIMESTAMP,
      valid_until       TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Appointment ↔ Coupon bridge ──────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS appointment_coupons (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      coupon_id         INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      discount_amount   INTEGER NOT NULL,    -- discount applied in cents
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(appointment_id, coupon_id)
    )
  `);

  // ── Add payment_status column to appointments ────────────
  await run(`
    ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  `);
  // pending | requires_payment | paid | deposit_paid | refunded | partially_refunded

  // ── Add deposit_required column to services ──────────────
  await run(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS deposit_required INTEGER DEFAULT 0
  `);
  // Amount in cents required as deposit (0 = full payment required at booking)

  // ── Add price_in_cents to services for precision ─────────
  await run(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS price_in_cents INTEGER
        GENERATED ALWAYS AS (CAST(ROUND(price * 100) AS INTEGER)) STORED
  `);
};
