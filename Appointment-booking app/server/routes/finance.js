/**
 * Finance Enhancements Route — Tax, dynamic pricing, credits, tips, BNPL
 *
 * GET    /api/tax-rates                   List active tax rates
 * POST   /api/admin/tax-rates             Create tax rate
 * PUT    /api/admin/tax-rates/:id         Update tax rate
 * DELETE /api/admin/tax-rates/:id         Deactivate tax rate
 * POST   /api/admin/service-tax           Link tax rate to service
 * DELETE /api/admin/service-tax           Unlink tax rate from service
 *
 * GET    /api/admin/dynamic-pricing       List pricing rules
 * POST   /api/admin/dynamic-pricing       Create pricing rule
 * PUT    /api/admin/dynamic-pricing/:id   Update pricing rule
 * DELETE /api/admin/dynamic-pricing/:id   Delete pricing rule
 *
 * GET    /api/credits                     User's credit balance
 * POST   /api/credits/purchase            Purchase credits
 * GET    /api/credits/transactions        Credit history
 *
 * GET    /api/admin/tip-settings          Get tip settings
 * PUT    /api/admin/tip-settings          Update tip settings
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Public: List tax rates ──────────────────────────

router.get('/tax-rates', async (req, res) => {
  try { const rates = await queryAll('SELECT * FROM tax_rates WHERE is_active = 1'); res.json({ tax_rates: rates }); }
  catch (err) { logger.error({ err }, 'Failed to list tax rates'); sendError(res, 500, 'Failed to load tax rates'); }
});

// ─── Credits (authenticated) ─────────────────────────

router.get('/credits', authenticateToken, async (req, res) => {
  try {
    let credits = await queryOne('SELECT * FROM user_credits WHERE user_id = $1', [req.user.id]);
    if (!credits) {
      const r = await run('INSERT INTO user_credits (user_id) VALUES ($1) RETURNING id', [req.user.id]);
      credits = await queryOne('SELECT * FROM user_credits WHERE id = $1', [r.lastInsertRowid]);
    }
    res.json({ credits });
  } catch (err) { logger.error({ err }, 'Failed to get credits'); sendError(res, 500, 'Failed to load credits'); }
});

router.get('/credits/transactions', authenticateToken, async (req, res) => {
  try {
    const txns = await queryAll('SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json({ transactions: txns });
  } catch (err) { logger.error({ err }, 'Failed to get credit transactions'); sendError(res, 500, 'Failed to load transactions'); }
});

router.post('/credits/purchase', authenticateToken, async (req, res) => {
  try {
    const { amount_cents, payment_intent_id } = req.body;
    if (!amount_cents || amount_cents < 100) return sendValidationError(res, 'Minimum purchase is $1.00');

    await run('INSERT INTO user_credits (user_id, balance_cents, lifetime_credits) VALUES ($1, $2, $2) ON CONFLICT (user_id) DO UPDATE SET balance_cents = user_credits.balance_cents + $2, lifetime_credits = user_credits.lifetime_credits + $2, updated_at = NOW()', [req.user.id, amount_cents]);
    await run('INSERT INTO credit_transactions (user_id, amount_cents, type, reference_type, reference_id) VALUES ($1, $2, $3, $4, $5)', [req.user.id, amount_cents, 'purchase', 'payment_intent', payment_intent_id || null]);

    const credits = await queryOne('SELECT * FROM user_credits WHERE user_id = $1', [req.user.id]);
    logger.info({ userId: req.user.id, amount: amount_cents }, 'Credits purchased');
    res.json({ message: 'Credits added', credits });
  } catch (err) { logger.error({ err }, 'Credit purchase failed'); sendError(res, 500, 'Failed to purchase credits'); }
});

// ─── Admin routes ────────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

// Tax rates CRUD
adminRouter.get('/tax-rates', async (req, res) => {
  const rates = await queryAll('SELECT * FROM tax_rates ORDER BY name');
  res.json({ tax_rates: rates });
});

adminRouter.post('/tax-rates', async (req, res) => {
  const { name, rate_percent, tax_type } = req.body;
  if (!name || rate_percent === undefined) return sendValidationError(res, 'name and rate_percent are required');
  const r = await run('INSERT INTO tax_rates (name, rate_percent, tax_type) VALUES ($1, $2, $3) RETURNING id', [name, rate_percent, tax_type || 'inclusive']);
  const rate = await queryOne('SELECT * FROM tax_rates WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ tax_rate: rate });
});

adminRouter.put('/tax-rates/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM tax_rates WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Tax rate not found');
  const { name, rate_percent, tax_type, is_active } = req.body;
  const updates = []; const params = []; let idx = 1;
  if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name); idx++; }
  if (rate_percent !== undefined) { updates.push(`rate_percent = $${idx}`); params.push(rate_percent); idx++; }
  if (tax_type !== undefined) { updates.push(`tax_type = $${idx}`); params.push(tax_type); idx++; }
  if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active ? 1 : 0); idx++; }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE tax_rates SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  const rate = await queryOne('SELECT * FROM tax_rates WHERE id = $1', [req.params.id]);
  res.json({ tax_rate: rate });
});

adminRouter.delete('/tax-rates/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM tax_rates WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Tax rate not found');
  await run('UPDATE tax_rates SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Tax rate deactivated' });
});

// Service-tax linking
adminRouter.post('/service-tax', async (req, res) => {
  const { service_id, tax_rate_id } = req.body;
  if (!service_id || !tax_rate_id) return sendValidationError(res, 'service_id and tax_rate_id are required');
  await run('INSERT INTO service_tax_rates (service_id, tax_rate_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [service_id, tax_rate_id]);
  res.status(201).json({ message: 'Tax rate linked to service' });
});

adminRouter.delete('/service-tax', async (req, res) => {
  const { service_id, tax_rate_id } = req.body;
  if (!service_id || !tax_rate_id) return sendValidationError(res, 'service_id and tax_rate_id are required');
  await run('DELETE FROM service_tax_rates WHERE service_id = $1 AND tax_rate_id = $2', [service_id, tax_rate_id]);
  res.json({ message: 'Tax rate unlinked' });
});

// Dynamic pricing rules
adminRouter.get('/dynamic-pricing', async (req, res) => {
  const rules = await queryAll('SELECT * FROM dynamic_pricing_rules ORDER BY priority DESC');
  res.json({ rules });
});

adminRouter.post('/dynamic-pricing', async (req, res) => {
  const { service_id, rule_type, days_of_week, start_time, end_time, start_date, end_date, adjustment_type, adjustment_value, priority } = req.body;
  if (!rule_type || !adjustment_type || adjustment_value === undefined) return sendValidationError(res, 'rule_type, adjustment_type, adjustment_value are required');
  const r = await run(`INSERT INTO dynamic_pricing_rules (service_id, rule_type, days_of_week, start_time, end_time, start_date, end_date, adjustment_type, adjustment_value, priority)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [service_id || null, rule_type, days_of_week || null, start_time || null, end_time || null, start_date || null, end_date || null, adjustment_type, adjustment_value, priority || 0]);
  const rule = await queryOne('SELECT * FROM dynamic_pricing_rules WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ rule });
});

adminRouter.put('/dynamic-pricing/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM dynamic_pricing_rules WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Rule not found');
  const fields = ['service_id', 'rule_type', 'days_of_week', 'start_time', 'end_time', 'start_date', 'end_date', 'adjustment_type', 'adjustment_value', 'priority', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; }
  }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE dynamic_pricing_rules SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  const rule = await queryOne('SELECT * FROM dynamic_pricing_rules WHERE id = $1', [req.params.id]);
  res.json({ rule });
});

adminRouter.delete('/dynamic-pricing/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM dynamic_pricing_rules WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Rule not found');
  await run('DELETE FROM dynamic_pricing_rules WHERE id = $1', [req.params.id]);
  res.json({ message: 'Rule deleted' });
});

// Tip settings
adminRouter.get('/tip-settings', async (req, res) => {
  let settings = await queryOne('SELECT * FROM tip_settings LIMIT 1');
  if (!settings) {
    await run("INSERT INTO tip_settings (default_percentages) VALUES ('{15,18,20,25}')");
    settings = await queryOne('SELECT * FROM tip_settings LIMIT 1');
  }
  res.json({ tip_settings: settings });
});

adminRouter.put('/tip-settings', async (req, res) => {
  const { is_enabled, default_percentages, custom_enabled } = req.body;
  const updates = []; const params = []; let idx = 1;
  if (is_enabled !== undefined) { updates.push(`is_enabled = $${idx}`); params.push(is_enabled ? 1 : 0); idx++; }
  if (default_percentages !== undefined) { updates.push(`default_percentages = $${idx}`); params.push(default_percentages); idx++; }
  if (custom_enabled !== undefined) { updates.push(`custom_enabled = $${idx}`); params.push(custom_enabled ? 1 : 0); idx++; }
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    await run(`UPDATE tip_settings SET ${updates.join(', ')} WHERE id = 1`, params);
  }
  const settings = await queryOne('SELECT * FROM tip_settings LIMIT 1');
  res.json({ tip_settings: settings });
});

// ─── Early bird discounts ─────────────────────────

adminRouter.get('/early-bird', async (req, res) => {
  const discounts = await queryAll('SELECT * FROM early_bird_discounts ORDER BY days_before');
  res.json({ early_bird_discounts: discounts });
});

adminRouter.post('/early-bird', async (req, res) => {
  const { service_id, days_before, discount_percent, max_discount_cents } = req.body;
  if (!days_before || discount_percent === undefined) return sendValidationError(res, 'days_before and discount_percent are required');
  const r = await run('INSERT INTO early_bird_discounts (service_id, days_before, discount_percent, max_discount_cents) VALUES ($1,$2,$3,$4) RETURNING id',
    [service_id || null, days_before, discount_percent, max_discount_cents || null]);
  res.status(201).json({ early_bird: await queryOne('SELECT * FROM early_bird_discounts WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.put('/early-bird/:id', async (req, res) => {
  const fields = ['service_id', 'days_before', 'discount_percent', 'max_discount_cents', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; } }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE early_bird_discounts SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ early_bird: await queryOne('SELECT * FROM early_bird_discounts WHERE id = $1', [req.params.id]) });
});

adminRouter.delete('/early-bird/:id', async (req, res) => {
  await run('UPDATE early_bird_discounts SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Early bird discount deactivated' });
});

// ─── Last-minute deals ───────────────────────────

adminRouter.get('/last-minute', async (req, res) => {
  const deals = await queryAll('SELECT * FROM last_minute_deals ORDER BY hours_before');
  res.json({ last_minute_deals: deals });
});

adminRouter.post('/last-minute', async (req, res) => {
  const { service_id, hours_before, discount_percent, max_quantity } = req.body;
  if (!service_id || !hours_before || discount_percent === undefined) return sendValidationError(res, 'service_id, hours_before, discount_percent are required');
  const r = await run('INSERT INTO last_minute_deals (service_id, hours_before, discount_percent, max_quantity) VALUES ($1,$2,$3,$4) RETURNING id',
    [service_id, hours_before, discount_percent, max_quantity || 0]);
  res.status(201).json({ deal: await queryOne('SELECT * FROM last_minute_deals WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.put('/last-minute/:id', async (req, res) => {
  const fields = ['service_id', 'hours_before', 'discount_percent', 'max_quantity', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; } }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE last_minute_deals SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ deal: await queryOne('SELECT * FROM last_minute_deals WHERE id = $1', [req.params.id]) });
});

router.use('/admin', adminRouter);

module.exports = router;
