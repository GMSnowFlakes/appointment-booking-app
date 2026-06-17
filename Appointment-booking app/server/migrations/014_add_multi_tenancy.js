/**
 * Migration 014: Multi-tenancy / SaaS mode.
 *
 * Creates:
 *   - tenants              Top-level tenant (business) records
 *   - tenant_users         Junction: which users belong to which tenants with roles
 *   - tenant_subscriptions Billing/subscription info per tenant
 *
 * Note: This migration assumes existing data becomes tenant_id=1 (the "default" tenant).
 */
module.exports = async ({ run }) => {
  // ── Tenants ──────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id                SERIAL PRIMARY KEY,
      slug              TEXT NOT NULL UNIQUE,  -- URL-friendly identifier
      name              TEXT NOT NULL,
      domain            TEXT UNIQUE,           -- Custom domain (optional)
      subdomain         TEXT UNIQUE,           -- *.app.com subdomain
      logo_url          TEXT,
      business_type     TEXT DEFAULT 'salon',
      primary_color     TEXT DEFAULT '#e11d48',
      is_active         INTEGER DEFAULT 1,
      max_staff         INTEGER DEFAULT 5,     -- Plan limit
      max_services      INTEGER DEFAULT 20,
      features          JSONB DEFAULT '{}',    -- Feature flags for plan tier
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Seed default tenant (for existing single-tenant data) ─
  // Use hardcoded VALUES so the default tenant is always created,
  // even when business_settings is empty (e.g. fresh database installs).
  // The business_settings table may not be populated yet because
  // seed data runs after migrations finish.
  await run(`
    INSERT INTO tenants (slug, name, business_type, primary_color)
    VALUES ('default', 'My Business', 'salon', '#e11d48')
    ON CONFLICT (slug) DO NOTHING
  `);

  // ── Tenant ↔ Users Junction ──────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS tenant_users (
      id                SERIAL PRIMARY KEY,
      tenant_id         INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role              TEXT NOT NULL DEFAULT 'member',
                        -- 'owner', 'admin', 'staff', 'member'
      invited_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      joined_at         TIMESTAMP DEFAULT NOW(),
      UNIQUE(tenant_id, user_id)
    )
  `);

  // ── Tenant Subscriptions (SaaS billing) ──────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS tenant_subscriptions (
      id                SERIAL PRIMARY KEY,
      tenant_id         INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
      plan              TEXT NOT NULL DEFAULT 'free',
                        -- 'free', 'starter', 'pro', 'enterprise'
      stripe_subscription_id TEXT,
      status            TEXT DEFAULT 'active',
                        -- active, past_due, canceled, trialing
      current_period_start TIMESTAMP,
      current_period_end   TIMESTAMP,
      trial_ends_at     TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
