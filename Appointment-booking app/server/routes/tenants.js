/**
 * Multi-tenancy / SaaS Route
 *
 * POST   /api/tenants/register     Register a new tenant (business)
 * GET    /api/tenants/current      Get current tenant info
 * PUT    /api/tenants/current      Update tenant settings
 * POST   /api/tenants/invite       Invite user to tenant
 * GET    /api/tenants/members      List tenant members
 * DELETE /api/tenants/members/:id  Remove member from tenant
 * POST   /api/admin/tenants        Admin: list/manage all tenants
 */

const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Register new tenant (creates business) ──────────

router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { name, slug, business_type, subdomain } = req.body;
    if (!name || !slug) return sendValidationError(res, 'name and slug are required');

    // Check slug uniqueness
    const existing = await queryOne('SELECT id FROM tenants WHERE slug = $1', [slug.toLowerCase()]);
    if (existing) return sendError(res, 409, 'A tenant with this slug already exists');

    // Check subdomain uniqueness
    if (subdomain) {
      const subdomainExists = await queryOne('SELECT id FROM tenants WHERE subdomain = $1', [subdomain.toLowerCase()]);
      if (subdomainExists) return sendError(res, 409, 'This subdomain is already taken');
    }

    // Create tenant
    const result = await run(`
      INSERT INTO tenants (slug, name, business_type, subdomain, primary_color)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [slug.toLowerCase(), name, business_type || 'salon', subdomain?.toLowerCase() || null, '#e11d48']);

    const tenantId = result.lastInsertRowid;

    // Add creator as owner
    await run(`
      INSERT INTO tenant_users (tenant_id, user_id, role) VALUES ($1, $2, 'owner')
    `, [tenantId, req.user.id]);

    // Create default subscription
    await run(`
      INSERT INTO tenant_subscriptions (tenant_id, plan, status)
      VALUES ($1, 'free', 'active')
    `, [tenantId]);

    // Create business settings for this tenant
    await run(`
      INSERT INTO business_settings (business_name, business_type)
      VALUES ($1, $2)
    `, [name, business_type || 'salon']);

    const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [tenantId]);

    logger.info({ tenantId, name: tenant?.name }, 'New tenant registered');
    res.status(201).json({ message: 'Business created successfully', tenant });
  } catch (err) {
    logger.error({ err }, 'Tenant registration failed');
    sendError(res, 500, err.message || 'Failed to create business');
  }
});

// ─── Get current tenant ─────────────────────────────

router.get('/current', authenticateToken, async (req, res) => {
  // Determine tenant from subdomain or default
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];

  let tenant;
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
    tenant = await queryOne('SELECT * FROM tenants WHERE subdomain = $1', [subdomain]);
  }

  if (!tenant) {
    tenant = await queryOne("SELECT * FROM tenants WHERE slug = 'default'");
  }

  if (!tenant) return sendNotFoundError(res, 'No tenant found');

  // Get subscription
  const subscription = await queryOne(
    'SELECT * FROM tenant_subscriptions WHERE tenant_id = $1', [tenant.id]
  );

  // Check membership
  const membership = await queryOne(
    'SELECT * FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
    [tenant.id, req.user.id]
  );

  res.json({
    tenant,
    subscription,
    role: membership?.role || 'none',
    features: tenant.features || {},
  });
});

// ─── Update tenant settings ─────────────────────────

router.put('/current', authenticateToken, async (req, res) => {
  // Determine tenant
  let tenant = await queryOne("SELECT * FROM tenants WHERE slug = 'default'");
  if (!tenant) return sendNotFoundError(res, 'Tenant not found');

  // Check permission
  const membership = await queryOne(
    'SELECT * FROM tenant_users WHERE tenant_id = $1 AND user_id = $2 AND role IN ($3, $4)',
    [tenant.id, req.user.id, 'owner', 'admin']
  );
  if (!membership) return sendError(res, 403, 'Only owners and admins can update settings');

  const { name, business_type, primary_color, logo_url, domain } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name); idx++; }
  if (business_type !== undefined) { updates.push(`business_type = $${idx}`); params.push(business_type); idx++; }
  if (primary_color !== undefined) { updates.push(`primary_color = $${idx}`); params.push(primary_color); idx++; }
  if (logo_url !== undefined) { updates.push(`logo_url = $${idx}`); params.push(logo_url); idx++; }
  if (domain !== undefined) {
    const domainExists = await queryOne('SELECT id FROM tenants WHERE domain = $1 AND id != $2', [domain, tenant.id]);
    if (domainExists) return sendError(res, 409, 'Domain already in use');
    updates.push(`domain = $${idx}`); params.push(domain); idx++;
  }

  if (updates.length === 0) return sendValidationError(res, 'No fields to update');

  params.push(tenant.id);
  await run(`UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);

  tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [tenant.id]);
  res.json({ message: 'Tenant updated', tenant });
});

// ─── Invite user to tenant ──────────────────────────

router.post('/invite', authenticateToken, async (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) return sendValidationError(res, 'email is required');

  const tenant = await queryOne("SELECT * FROM tenants WHERE slug = 'default'");
  if (!tenant) return sendNotFoundError(res, 'Tenant not found');

  const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
  if (!user) return sendError(res, 404, 'User not found. They need to register first.');

  // Check not already a member
  const existing = await queryOne(
    'SELECT * FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
    [tenant.id, user.id]
  );
  if (existing) return sendError(res, 409, 'User is already a member of this business');

  await run(`
    INSERT INTO tenant_users (tenant_id, user_id, role, invited_by)
    VALUES ($1, $2, $3, $4)
  `, [tenant.id, user.id, role, req.user.id]);

  logger.info({ tenantId: tenant.id, invitedUser: user.id }, 'User invited to tenant');
  res.json({ message: `Invited ${email} to the business` });
});

// ─── List tenant members ────────────────────────────

router.get('/members', authenticateToken, async (req, res) => {
  const tenant = await queryOne("SELECT * FROM tenants WHERE slug = 'default'");
  if (!tenant) return sendNotFoundError(res, 'Tenant not found');

  const members = await queryAll(`
    SELECT tu.*, u.name, u.email, u.role as user_role
    FROM tenant_users tu
    JOIN users u ON tu.user_id = u.id
    WHERE tu.tenant_id = $1
    ORDER BY tu.joined_at
  `, [tenant.id]);

  res.json({ members });
});

// ─── Remove member ──────────────────────────────────

router.delete('/members/:userId', authenticateToken, async (req, res) => {
  const tenant = await queryOne("SELECT * FROM tenants WHERE slug = 'default'");
  if (!tenant) return sendNotFoundError(res, 'Tenant not found');

  const target = await queryOne(
    'SELECT * FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
    [tenant.id, req.params.userId]
  );
  if (!target) return sendNotFoundError(res, 'Member not found');
  if (target.role === 'owner') return sendError(res, 400, 'Cannot remove the owner');

  await run('DELETE FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
    [tenant.id, req.params.userId]);

  res.json({ message: 'Member removed from business' });
});

module.exports = router;
