/**
 * Packages & Bundle Deals Route
 *
 * GET    /api/packages              List active packages
 * GET    /api/packages/:id          Package details
 * POST   /api/packages/purchase     Purchase a package
 * GET    /api/packages/my           User's purchased packages
 * POST   /api/packages/use          Apply a session from a package to an appointment
 * GET    /api/admin/packages        Admin: list all packages
 * POST   /api/admin/packages        Admin: create package
 * PUT    /api/admin/packages/:id    Admin: update package
 * DELETE /api/admin/packages/:id    Admin: deactivate package
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Public: List active packages ───────────────────────

router.get('/', async (req, res) => {
  try {
    const packages = await queryAll(
      'SELECT * FROM packages WHERE is_active = 1 ORDER BY name'
    );
    res.json({ packages: packages.map(p => ({
      ...p,
      original_price: (p.original_price_cents / 100).toFixed(2),
      package_price: (p.package_price_cents / 100).toFixed(2),
      savings_percent: Math.round(p.savings_percent),
    })) });
  } catch (err) {
    logger.error({ err }, 'Failed to list packages');
    sendError(res, 500, 'Failed to load packages');
  }
});

// ─── Authenticated: User's purchased packages ──────────
// IMPORTANT: /my must be defined before /:id to avoid route conflict

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const packages = await queryAll(`
      SELECT up.*, p.name, p.description, p.session_count, p.original_price_cents, p.package_price_cents, p.savings_percent
      FROM user_packages up
      JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = $1 AND up.is_active = 1
      ORDER BY up.created_at DESC
    `, [req.user.id]);

    res.json({ packages });
  } catch (err) {
    logger.error({ err }, 'Failed to list user packages');
    sendError(res, 500, 'Failed to load packages');
  }
});

// ─── Public: Package details by ID ─────────────────────

router.get('/:id', async (req, res) => {
  try {
    const pkg = await queryOne('SELECT * FROM packages WHERE id = $1 AND is_active = 1', [req.params.id]);
    if (!pkg) return sendNotFoundError(res, 'Package not found');
    res.json({ package: { ...pkg, original_price: (pkg.original_price_cents / 100).toFixed(2), package_price: (pkg.package_price_cents / 100).toFixed(2) } });
  } catch (err) {
    logger.error({ err }, 'Failed to get package');
    sendError(res, 500, 'Failed to load package');
  }
});

// ─── Authenticated: Purchase a package ─────────────────

router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { package_id, payment_intent_id } = req.body;
    if (!package_id) return sendValidationError(res, 'package_id is required');

    const pkg = await queryOne('SELECT * FROM packages WHERE id = $1 AND is_active = 1', [package_id]);
    if (!pkg) return sendNotFoundError(res, 'Package not found');

    const expiresAt = pkg.expires_days
      ? new Date(Date.now() + pkg.expires_days * 86400000).toISOString()
      : null;

    const result = await run(`
      INSERT INTO user_packages (user_id, package_id, sessions_used, sessions_total, payment_intent_id, expires_at)
      VALUES ($1, $2, 0, $3, $4, $5)
      RETURNING id
    `, [req.user.id, package_id, pkg.session_count, payment_intent_id || null, expiresAt]);

    const up = await queryOne('SELECT * FROM user_packages WHERE id = $1', [result.lastInsertRowid]);

    logger.info({ userId: req.user.id, packageId: package_id }, 'Package purchased');
    res.status(201).json({ message: 'Package purchased successfully', user_package: up });
  } catch (err) {
    logger.error({ err }, 'Package purchase failed');
    sendError(res, 500, 'Failed to purchase package');
  }
});

// ─── Authenticated: Use a session from a package ───────

router.post('/use', authenticateToken, async (req, res) => {
  try {
    const { user_package_id, appointment_id } = req.body;
    if (!user_package_id || !appointment_id) return sendValidationError(res, 'user_package_id and appointment_id are required');

    const up = await queryOne(
      'SELECT * FROM user_packages WHERE id = $1 AND user_id = $2 AND is_active = 1',
      [user_package_id, req.user.id]
    );
    if (!up) return sendNotFoundError(res, 'Package not found');

    if (up.sessions_used >= up.sessions_total) return sendError(res, 400, 'Package has no remaining sessions');
    if (up.expires_at && new Date(up.expires_at) < new Date()) return sendError(res, 400, 'Package has expired');

    const apt = await queryOne(
      'SELECT id FROM appointments WHERE id = $1 AND user_id = $2',
      [appointment_id, req.user.id]
    );
    if (!apt) return sendNotFoundError(res, 'Appointment not found');

    await run(
      'UPDATE user_packages SET sessions_used = sessions_used + 1 WHERE id = $1',
      [user_package_id]
    );
    await run(
      'INSERT INTO appointment_packages (appointment_id, user_package_id) VALUES ($1, $2)',
      [appointment_id, user_package_id]
    );

    const updated = await queryOne('SELECT * FROM user_packages WHERE id = $1', [user_package_id]);

    logger.info({ userId: req.user.id, packageId: user_package_id, appointmentId: appointment_id }, 'Package session used');
    res.json({ message: 'Package session applied', user_package: updated });
  } catch (err) {
    logger.error({ err }, 'Failed to use package session');
    sendError(res, 500, 'Failed to use package session');
  }
});

// ─── Admin CRUD ───────────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const packages = await queryAll('SELECT * FROM packages ORDER BY created_at DESC');
  res.json({ packages });
});

adminRouter.post('/', async (req, res) => {
  const { name, description, service_id, session_count, original_price, package_price, expires_days } = req.body;
  if (!name || !service_id || !session_count || original_price === undefined || package_price === undefined) {
    return sendValidationError(res, 'name, service_id, session_count, original_price, and package_price are required');
  }

  const result = await run(`
    INSERT INTO packages (name, description, service_id, session_count, original_price_cents, package_price_cents, expires_days)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    name, description || null, service_id, session_count,
    Math.round(parseFloat(original_price) * 100),
    Math.round(parseFloat(package_price) * 100),
    expires_days || null,
  ]);

  const pkg = await queryOne('SELECT * FROM packages WHERE id = $1', [result.lastInsertRowid]);
  logger.info({ packageId: pkg?.id, name }, 'Admin created package');
  res.status(201).json({ message: 'Package created successfully', package: pkg });
});

adminRouter.put('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM packages WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Package not found');

  const fields = ['name', 'description', 'service_id', 'session_count', 'expires_days', 'is_active'];
  const updates = [];
  const params = [];
  let idx = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${idx}`);
      params.push(req.body[f]);
      idx++;
    }
  }
  if (req.body.original_price !== undefined) {
    updates.push(`original_price_cents = $${idx}`);
    params.push(Math.round(parseFloat(req.body.original_price) * 100));
    idx++;
  }
  if (req.body.package_price !== undefined) {
    updates.push(`package_price_cents = $${idx}`);
    params.push(Math.round(parseFloat(req.body.package_price) * 100));
    idx++;
  }

  if (updates.length === 0) return sendValidationError(res, 'No fields to update');

  params.push(req.params.id);
  await run(`UPDATE packages SET ${updates.join(', ')} WHERE id = $${idx}`, params);

  const pkg = await queryOne('SELECT * FROM packages WHERE id = $1', [req.params.id]);
  res.json({ message: 'Package updated successfully', package: pkg });
});

adminRouter.delete('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM packages WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Package not found');
  await run('UPDATE packages SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Package deactivated successfully' });
});

router.use('/admin', adminRouter);

module.exports = router;
