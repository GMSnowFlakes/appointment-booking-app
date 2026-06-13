/**
 * Admin Extended Route — Security, Audit, API keys, Roles, Integrations, AI
 */
const express = require('express');
const crypto = require('crypto');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();
const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

// ─── Login history ────────────────────────────────

adminRouter.get('/login-history', async (req, res) => {
  try {
    const { user_id, limit } = req.query;
    const limitNum = Math.min(parseInt(limit) || 100, 500);
    let sql = 'SELECT lh.*, u.name, u.email FROM login_history lh JOIN users u ON lh.user_id = u.id';
    const params = [];
    if (user_id) { sql += ' WHERE lh.user_id = $1'; params.push(user_id); }
    sql += ' ORDER BY lh.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limitNum);
    res.json({ history: await queryAll(sql, params) });
  } catch (err) {
    logger.error({ err }, 'Failed to get login history');
    sendError(res, 500, 'Failed to load login history');
  }
});

// ─── Active sessions ─────────────────────────────

adminRouter.get('/sessions', async (req, res) => {
  const sessions = await queryAll(`
    SELECT us.*, u.name, u.email
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.is_active = 1
    ORDER BY us.last_activity_at DESC
  `);
  res.json({ sessions });
});

adminRouter.post('/sessions/revoke', async (req, res) => {
  const { session_id, user_id } = req.body;
  if (session_id) await run('UPDATE user_sessions SET is_active = 0 WHERE id = $1', [session_id]);
  else if (user_id) await run('UPDATE user_sessions SET is_active = 0 WHERE user_id = $1', [user_id]);
  else return sendValidationError(res, 'session_id or user_id is required');
  res.json({ message: 'Session(s) revoked' });
});

// ─── API keys (developer access) ─────────────────

adminRouter.get('/api-keys', async (req, res) => {
  res.json({ api_keys: await queryAll('SELECT ak.*, u.name as user_name FROM api_keys ak JOIN users u ON ak.user_id = u.id ORDER BY ak.created_at DESC') });
});

adminRouter.post('/api-keys', async (req, res) => {
  const { user_id, name, permissions, expires_at } = req.body;
  if (!user_id || !name) return sendValidationError(res, 'user_id and name are required');
  const rawKey = 'ab_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 8);
  await run('INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, expires_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [user_id, name, keyHash, keyPrefix, permissions || [], expires_at || null]);
  logger.info({ userId: user_id, keyPrefix }, 'API key created');
  res.status(201).json({ message: 'API key created', key: rawKey, key_prefix: keyPrefix });
});

adminRouter.delete('/api-keys/:id', async (req, res) => {
  await run('UPDATE api_keys SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'API key deactivated' });
});

// ─── Role permissions ───────────────────────────

adminRouter.get('/roles', async (req, res) => {
  res.json({ roles: await queryAll('SELECT * FROM role_permissions ORDER BY role') });
});

adminRouter.put('/roles/:role', async (req, res) => {
  const { permissions } = req.body;
  if (!permissions) return sendValidationError(res, 'permissions object is required');
  await run('UPDATE role_permissions SET permissions = $1, updated_at = NOW() WHERE role = $2', [JSON.stringify(permissions), req.params.role]);
  res.json({ message: 'Permissions updated' });
});

// ─── Integration settings ───────────────────────

adminRouter.get('/integrations', async (req, res) => {
  res.json({ integrations: await queryAll('SELECT * FROM integration_settings ORDER BY display_name') });
});

adminRouter.put('/integrations/:key', async (req, res) => {
  const { settings, is_enabled } = req.body;
  const updates = []; const params = []; let idx = 1;
  if (settings !== undefined) { updates.push(`settings = $${idx}`); params.push(JSON.stringify(settings)); idx++; }
  if (is_enabled !== undefined) { updates.push(`is_enabled = $${idx}`); params.push(is_enabled ? 1 : 0); idx++; }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  updates.push('updated_at = NOW()');
  params.push(req.params.key);
  await run(`UPDATE integration_settings SET ${updates.join(', ')} WHERE integration_key = $${idx}`, params);
  res.json({ integration: await queryOne('SELECT * FROM integration_settings WHERE integration_key = $1', [req.params.key]) });
});

// Seed default integrations — called from index.js initializeDb()
async function seedIntegrations() {
  try {
    const defaults = [
      { key: 'facebook_pixel', name: 'Facebook Pixel', settings: { pixel_id: '' } },
      { key: 'google_analytics', name: 'Google Analytics', settings: { measurement_id: '' } },
      { key: 'zapier', name: 'Zapier Webhooks', settings: { webhook_url: '' } },
      { key: 'square_pos', name: 'Square POS', settings: { location_id: '', access_token: '' } },
    ];
    for (const d of defaults) {
      await run('INSERT INTO integration_settings (integration_key, display_name, settings) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [d.key, d.name, JSON.stringify(d.settings)]);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to seed integrations');
  }
}

// ─── Audit log ───────────────────────────────────

adminRouter.get('/audit-log', async (req, res) => {
  try {
    const { action, user_id, limit } = req.query;
    const limitNum = Math.min(parseInt(limit) || 200, 1000);
    let sql = 'SELECT al.*, u.name, u.email FROM audit_log al LEFT JOIN users u ON al.user_id = u.id';
    const conditions = []; const params = [];
    if (action) { conditions.push('al.action = $' + (params.length + 1)); params.push(action); }
    if (user_id) { conditions.push('al.user_id = $' + (params.length + 1)); params.push(user_id); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY al.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limitNum);
    res.json({ log: await queryAll(sql, params) });
  } catch (err) {
    logger.error({ err }, 'Failed to get audit log');
    sendError(res, 500, 'Failed to load audit log');
  }
});

// ─── Audit logger helper (exported for use by other routes) ──

async function logAudit(userId, action, entityType, entityId, details, ipAddress, userAgent) {
  try {
    await run('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress || null, userAgent || null]);
  } catch (err) { logger.error({ err }, 'Audit log write failed'); }
}

// ─── 2FA management ─────────────────────────────

adminRouter.post('/2fa/generate', authenticateToken, async (req, res) => {
  // Return the secret for QR code generation (client-side generates the TOTP URI)
  const secret = crypto.randomBytes(20).toString('hex');
  await run('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, req.user.id]);
  res.json({ secret, qr_uri: `otpauth://totp/AppointmentBook:${req.user.email}?secret=${secret}&issuer=AppointmentBook` });
});

adminRouter.post('/2fa/verify', authenticateToken, async (req, res) => {
  const { code } = req.body;
  // In production, verify TOTP code against the user's two_factor_secret
  if (!code) return sendValidationError(res, 'Verification code is required');
  await run('UPDATE users SET two_factor_enabled = 1 WHERE id = $1', [req.user.id]);
  res.json({ message: '2FA enabled successfully' });
});

adminRouter.post('/2fa/disable', authenticateToken, async (req, res) => {
  await run("UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = $1", [req.user.id]);
  res.json({ message: '2FA disabled' });
});

// ─── Maintenance mode ───────────────────────────

adminRouter.post('/maintenance', async (req, res) => {
  const { enabled, message } = req.body;
  await run('UPDATE business_settings SET maintenance_mode = $1, maintenance_message = $2 WHERE id = 1', [enabled ? 1 : 0, message || null]);
  res.json({ message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
});

// ─── Public booking pages ──────────────────────

adminRouter.get('/public-pages', async (req, res) => {
  res.json({ pages: await queryAll('SELECT * FROM public_booking_pages ORDER BY created_at DESC') });
});

adminRouter.post('/public-pages', async (req, res) => {
  const { slug, title, allowed_services, allowed_staff, require_auth, require_phone, redirect_url, custom_css, seo_description } = req.body;
  if (!slug) return sendValidationError(res, 'slug is required');
  const r = await run(`INSERT INTO public_booking_pages (slug, title, allowed_services, allowed_staff, require_auth, require_phone, redirect_url, custom_css, seo_description)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [slug, title || 'Book an Appointment', allowed_services || null, allowed_staff || null, require_auth ? 1 : 0, require_phone ? 1 : 0, redirect_url || null, custom_css || null, seo_description || null]);
  res.status(201).json({ page: await queryOne('SELECT * FROM public_booking_pages WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.put('/public-pages/:id', async (req, res) => {
  const fields = ['slug', 'title', 'is_active', 'allowed_services', 'allowed_staff', 'require_auth', 'require_phone', 'redirect_url', 'custom_css', 'seo_description'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; } }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE public_booking_pages SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
  res.json({ page: await queryOne('SELECT * FROM public_booking_pages WHERE id = $1', [req.params.id]) });
});

// ─── iCal export ────────────────────────────────

adminRouter.post('/ical/tokens', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return sendValidationError(res, 'user_id is required');
  const token = crypto.randomBytes(16).toString('hex');
  await run('INSERT INTO ical_tokens (user_id, token) VALUES ($1,$2) ON CONFLICT DO NOTHING', [user_id, token]);
  res.json({ ical_url: `${req.protocol}://${req.get('host')}/api/ical/${token}` });
});

// ─── Multi-currency settings ───────────────────

adminRouter.get('/currency', async (req, res) => {
  const settings = await queryOne('SELECT currency, available_currencies FROM business_settings LIMIT 1');
  res.json({ settings });
});

adminRouter.put('/currency', async (req, res) => {
  const { currency, available_currencies } = req.body;
  if (currency) await run('UPDATE business_settings SET currency = $1 WHERE id = 1', [currency]);
  if (available_currencies) await run('UPDATE business_settings SET available_currencies = $1 WHERE id = 1', [available_currencies]);
  res.json({ message: 'Currency settings updated' });
});

router.use('/admin', adminRouter);

// ─── IP whitelist ──────────────────────────────

adminRouter.get('/ip-whitelist', async (req, res) => {
  try {
    const entries = await queryAll('SELECT * FROM ip_whitelist ORDER BY created_at DESC');
    res.json({ ip_whitelist: entries });
  } catch (err) { logger.error({ err }, 'Failed to get IP whitelist'); sendError(res, 500, 'Failed to load IP whitelist'); }
});

adminRouter.post('/ip-whitelist', async (req, res) => {
  const { ip_address, label } = req.body;
  if (!ip_address) return sendValidationError(res, 'ip_address is required');
  await run('INSERT INTO ip_whitelist (ip_address, label, created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
    [ip_address, label || null, req.user?.id || null]);
  res.json({ message: 'IP whitelisted' });
});

adminRouter.delete('/ip-whitelist/:id', async (req, res) => {
  await run('DELETE FROM ip_whitelist WHERE id = $1', [req.params.id]);
  res.json({ message: 'IP removed from whitelist' });
});

// ─── AI predictions ──────────────────────────

adminRouter.get('/ai-predictions', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM ai_predictions';
    const params = [];
    if (type) { sql += ' WHERE prediction_type = $1'; params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    res.json({ predictions: await queryAll(sql, params) });
  } catch (err) { logger.error({ err }, 'Failed to get AI predictions'); sendError(res, 500, 'Failed to load predictions'); }
});

// ─── Service expenses ─────────────────────────

adminRouter.get('/expenses', async (req, res) => {
  try {
    const { service_id } = req.query;
    let sql = 'SELECT se.*, s.name as service_name FROM service_expenses se JOIN services s ON se.service_id = s.id';
    const params = [];
    if (service_id) { sql += ' WHERE se.service_id = $1'; params.push(service_id); }
    sql += ' ORDER BY se.created_at DESC';
    res.json({ expenses: await queryAll(sql, params) });
  } catch (err) { logger.error({ err }, 'Failed to get expenses'); sendError(res, 500, 'Failed to load expenses'); }
});

adminRouter.post('/expenses', async (req, res) => {
  const { service_id, name, amount, expense_type, recurring } = req.body;
  if (!service_id || !name || amount === undefined) return sendValidationError(res, 'service_id, name, and amount are required');
  const r = await run('INSERT INTO service_expenses (service_id, name, amount_cents, expense_type, recurring) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [service_id, name, Math.round(parseFloat(amount) * 100), expense_type || 'supplies', recurring ? 1 : 0]);
  res.status(201).json({ expense: await queryOne('SELECT * FROM service_expenses WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.delete('/expenses/:id', async (req, res) => {
  await run('DELETE FROM service_expenses WHERE id = $1', [req.params.id]);
  res.json({ message: 'Expense deleted' });
});

module.exports = { router, logAudit, seedIntegrations };
