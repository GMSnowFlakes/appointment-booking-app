/**
 * Migration 017: Loyalty points, gift cards, referral system
 */
module.exports = async ({ run }) => {
  // ── Loyalty points ──────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS loyalty_points (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      points            INTEGER DEFAULT 0,
      lifetime_points   INTEGER DEFAULT 0,
      tier              TEXT DEFAULT 'bronze',  -- bronze, silver, gold, platinum
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points            INTEGER NOT NULL,      -- positive = earned, negative = spent
      type              TEXT NOT NULL,         -- 'earned_booking', 'earned_referral', 'earned_review',
                                              -- 'spent_redemption', 'bonus', 'expired'
      reference_id      INTEGER,              -- appointment_id, referral_id, etc.
      description       TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      points_cost       INTEGER NOT NULL,
      reward_type       TEXT NOT NULL,         -- 'discount', 'free_service', 'product', 'upgrade'
      discount_percent  REAL,                 -- for discount type
      service_id        INTEGER REFERENCES services(id) ON DELETE SET NULL,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Gift cards ──────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id                SERIAL PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,
      issuer_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      recipient_email   TEXT,
      recipient_name    TEXT,
      initial_balance_cents INTEGER NOT NULL,
      remaining_balance_cents INTEGER NOT NULL,
      message           TEXT,
      is_digital        INTEGER DEFAULT 1,
      is_active         INTEGER DEFAULT 1,
      expires_at        TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS gift_card_redemptions (
      id                SERIAL PRIMARY KEY,
      gift_card_id      INTEGER NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
      appointment_id    INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      amount_cents      INTEGER NOT NULL,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Referral system ─────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id                SERIAL PRIMARY KEY,
      referrer_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_email    TEXT NOT NULL,
      referred_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      code              TEXT NOT NULL,
      status            TEXT DEFAULT 'pending',  -- pending, registered, booked, rewarded, expired
      reward_type       TEXT DEFAULT 'credit',
      reward_amount_cents INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
