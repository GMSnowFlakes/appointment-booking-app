/**
 * Migration 029: Add tenant scope to coupons and appointment_coupons.
 *
 * The coupons table was created in migration 007, which predates
 * multi-tenancy (migration 014). This migration fills the gap by:
 *   1. Verifying the coupons table exists (creates if missing)
 *   2. Adding a tenant_id column to coupons referencing tenants(id)
 *   3. Backfilling existing coupons with the default tenant
 *   4. Adding tenant_id to appointment_coupons
 *   5. Setting NOT NULL on both after backfill
 */

module.exports = async ({ run, queryOne }) => {
  // ── 1. Verify / ensure coupons table exists ─────────────---
  await run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id                SERIAL PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,
      description       TEXT,
      discount_type     TEXT NOT NULL,
      discount_value    REAL NOT NULL,
      min_appointment_amount INTEGER DEFAULT 0,
      max_uses          INTEGER DEFAULT 0,
      max_uses_per_user INTEGER DEFAULT 1,
      current_uses      INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1,
      valid_from        TIMESTAMP,
      valid_until       TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appointment_coupons (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      coupon_id         INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      discount_amount   INTEGER NOT NULL,
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(appointment_id, coupon_id)
    )
  `);

  // ── 2. Add tenant_id to coupons (nullable initially) ──────
  try {
    await run(`ALTER TABLE coupons ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)`);
  } catch (err) {
    if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists')) throw err;
  }

  // ── 3. Backfill existing coupons with default tenant ──────
  // Ensure the default tenant exists (fresh databases may not have one yet
  // if migration 014's business_settings-based INSERT returned 0 rows)
  await run(`
    INSERT INTO tenants (slug, name, business_type, primary_color)
    VALUES ('default', 'My Business', 'salon', '#e11d48')
    ON CONFLICT (slug) DO NOTHING
  `);

  const defaultTenant = await queryOne("SELECT id FROM tenants WHERE slug = 'default'");
  const defaultTenantId = defaultTenant?.id;
  if (!defaultTenantId) {
    throw new Error('Failed to create or find default tenant during migration 029');
  }

  await run(`UPDATE coupons SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);

  // ── 4. Add tenant_id to appointment_coupons ───────────────
  try {
    await run(`ALTER TABLE appointment_coupons ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)`);
  } catch (err) {
    if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists')) throw err;
  }

  await run(`UPDATE appointment_coupons SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);

  // ── 5. Set NOT NULL on tenant_id after backfill ────────────
  try {
    await run(`ALTER TABLE coupons ALTER COLUMN tenant_id SET NOT NULL`);
  } catch (err) {
    if (!err.message?.includes('already')) throw err;
  }
  try {
    await run(`ALTER TABLE appointment_coupons ALTER COLUMN tenant_id SET NOT NULL`);
  } catch (err) {
    if (!err.message?.includes('already')) throw err;
  }

  // ── 6. Add index on tenant_id for query performance ───────
  try {
    await run(`CREATE INDEX IF NOT EXISTS idx_coupons_tenant_id ON coupons(tenant_id)`);
  } catch (err) {
    // INDEX IF NOT EXISTS may not exist on all PG versions; silently skip if it fails
    if (!err.message?.includes('already exists')) {
      try {
        await run(`CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id)`);
      } catch { /* index already exists or DB doesn't support */ }
    }
  }
};
