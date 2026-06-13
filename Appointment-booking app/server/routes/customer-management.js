/**
 * Customer Management Route
 * Blacklist, tags, booking rules, group bookings, walk-ins, campaigns, NPS
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();
const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

// ─── Booking rules (global + per-service) ───────────

adminRouter.get('/booking-rules', async (req, res) => {
  const rules = await queryAll('SELECT * FROM booking_rules ORDER BY service_id NULLS FIRST');
  res.json({ rules });
});

adminRouter.post('/booking-rules', async (req, res) => {
  const { service_id, min_advance_hours, max_advance_days, allow_same_day, max_per_customer_per_day, min_gap_hours_same_service, max_reschedules } = req.body;
  await run(`INSERT INTO booking_rules (service_id, min_advance_hours, max_advance_days, allow_same_day, max_per_customer_per_day, min_gap_hours_same_service, max_reschedules)
    VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
    [service_id || null, min_advance_hours ?? 0, max_advance_days ?? 365, allow_same_day ?? 1, max_per_customer_per_day ?? 0, min_gap_hours_same_service ?? 0, max_reschedules ?? 0]);
  const rule = await queryOne('SELECT * FROM booking_rules WHERE service_id IS NULL AND NOT EXISTS (SELECT 1 FROM booking_rules WHERE service_id IS NOT NULL) UNION ALL SELECT * FROM booking_rules WHERE service_id = $1', [service_id || -1]);
  res.status(201).json({ rule });
});

adminRouter.put('/booking-rules/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM booking_rules WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Rule not found');
  const fields = ['service_id', 'min_advance_hours', 'max_advance_days', 'allow_same_day', 'max_per_customer_per_day', 'min_gap_hours_same_service', 'max_reschedules', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; } }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE booking_rules SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ rule: await queryOne('SELECT * FROM booking_rules WHERE id = $1', [req.params.id]) });
});

// ─── Customer blacklist ───────────────────────────

adminRouter.get('/blacklist', async (req, res) => {
  const entries = await queryAll(`
    SELECT cb.*, u.name, u.email, blocker.name as blocked_by_name
    FROM customer_blacklist cb
    JOIN users u ON cb.user_id = u.id
    LEFT JOIN users blocker ON cb.blocked_by = blocker.id
    WHERE cb.is_active = 1 ORDER BY cb.blocked_at DESC
  `);
  res.json({ blacklist: entries });
});

adminRouter.post('/blacklist', async (req, res) => {
  const { user_id, reason, expires_at } = req.body;
  if (!user_id || !reason) return sendValidationError(res, 'user_id and reason are required');
  await run('INSERT INTO customer_blacklist (user_id, reason, blocked_by, expires_at) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO UPDATE SET reason=$2, blocked_by=$3, expires_at=$4, is_active=1, blocked_at=NOW()',
    [user_id, reason, req.user?.id || null, expires_at || null]);
  logger.info({ userId: user_id, blockedBy: req.user?.id }, 'Customer blacklisted');
  res.json({ message: 'Customer blacklisted' });
});

adminRouter.delete('/blacklist/:userId', async (req, res) => {
  await run('UPDATE customer_blacklist SET is_active = 0 WHERE user_id = $1', [req.params.userId]);
  res.json({ message: 'Customer removed from blacklist' });
});

// ─── Customer tags ───────────────────────────────

adminRouter.post('/tags', async (req, res) => {
  const { user_id, tag } = req.body;
  if (!user_id || !tag) return sendValidationError(res, 'user_id and tag are required');
  await run('INSERT INTO customer_tags (user_id, tag, created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [user_id, tag, req.user?.id || null]);
  res.json({ message: 'Tag added' });
});

adminRouter.delete('/tags', async (req, res) => {
  const { user_id, tag } = req.body;
  if (!user_id || !tag) return sendValidationError(res, 'user_id and tag are required');
  await run('DELETE FROM customer_tags WHERE user_id = $1 AND tag = $2', [user_id, tag]);
  res.json({ message: 'Tag removed' });
});

// ─── Group / class bookings ──────────────────────

adminRouter.get('/group-bookings', async (req, res) => {
  const bookings = await queryAll(`SELECT gb.*, s.name as service_name FROM group_bookings gb JOIN services s ON gb.service_id = s.id ORDER BY gb.date DESC`);
  res.json({ group_bookings: bookings });
});

adminRouter.post('/group-bookings', async (req, res) => {
  const { service_id, staff_id, title, description, date, time, duration, max_capacity, price } = req.body;
  if (!service_id || !title || !date || !time || !duration || !max_capacity || price === undefined) return sendValidationError(res, 'Missing required fields');
  const r = await run(`INSERT INTO group_bookings (service_id, staff_id, title, description, date, time, duration, max_capacity, price_cents)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [service_id, staff_id || null, title, description || null, date, time, duration, max_capacity, Math.round(parseFloat(price) * 100)]);
  const gb = await queryOne('SELECT * FROM group_bookings WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ group_booking: gb });
});

adminRouter.put('/group-bookings/:id', async (req, res) => {
  const fields = ['title', 'description', 'date', 'time', 'duration', 'max_capacity', 'price_cents', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      const val = f === 'price_cents' ? Math.round(parseFloat(req.body[f]) * 100) : req.body[f];
      updates.push(`${f} = $${idx}`); params.push(val); idx++;
    }
  }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE group_bookings SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ group_booking: await queryOne('SELECT * FROM group_bookings WHERE id = $1', [req.params.id]) });
});

adminRouter.delete('/group-bookings/:id', async (req, res) => {
  await run('UPDATE group_bookings SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Group booking deactivated' });
});

adminRouter.get('/group-bookings/:id/attendees', async (req, res) => {
  const attendees = await queryAll(`SELECT ga.*, u.name, u.email FROM group_booking_attendees ga JOIN users u ON ga.user_id = u.id WHERE ga.group_booking_id = $1`, [req.params.id]);
  res.json({ attendees });
});

// ─── Walk-in tokens ──────────────────────────────

adminRouter.get('/walk-ins', async (req, res) => {
  const { status, date } = req.query;
  let sql = 'SELECT * FROM walk_in_tokens';
  const conditions = []; const params = [];
  if (status) { conditions.push('status = $' + (params.length + 1)); params.push(status); }
  if (date) { conditions.push('DATE(checked_in_at) = $' + (params.length + 1)); params.push(date); }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY token_number ASC';
  res.json({ walk_ins: await queryAll(sql, params) });
});

adminRouter.post('/walk-ins', async (req, res) => {
  const { service_id, customer_name, customer_phone, party_size } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  const maxToken = await queryOne("SELECT COALESCE(MAX(token_number), 0) as max FROM walk_in_tokens WHERE DATE(checked_in_at) = $1", [today]);
  const tokenNumber = (maxToken?.max || 0) + 1;
  const r = await run('INSERT INTO walk_in_tokens (token_number, service_id, customer_name, customer_phone, party_size, estimated_wait_minutes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [tokenNumber, service_id || null, customer_name || null, customer_phone || null, party_size || 1, 15]);
  const token = await queryOne('SELECT * FROM walk_in_tokens WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ walk_in: token });
});

adminRouter.put('/walk-ins/:id', async (req, res) => {
  const { status, started_at, appointment_id } = req.body;
  const updates = []; const params = []; let idx = 1;
  if (status) { updates.push(`status = $${idx}`); params.push(status); idx++; }
  if (started_at) { updates.push(`started_at = $${idx}`); params.push(started_at); idx++; }
  if (appointment_id) { updates.push(`appointment_id = $${idx}`); params.push(appointment_id); idx++; }
  if (status === 'completed' || status === 'cancelled' || status === 'no_show') { updates.push(`completed_at = NOW()`); }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE walk_in_tokens SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  res.json({ walk_in: await queryOne('SELECT * FROM walk_in_tokens WHERE id = $1', [req.params.id]) });
});

// ─── Email campaigns ─────────────────────────────

adminRouter.get('/campaigns', async (req, res) => {
  res.json({ campaigns: await queryAll('SELECT * FROM email_campaigns ORDER BY created_at DESC') });
});

adminRouter.post('/campaigns', async (req, res) => {
  const { name, campaign_type, subject, body_html, body_text, trigger_event, delay_hours } = req.body;
  if (!name || !campaign_type || !subject) return sendValidationError(res, 'name, campaign_type, subject are required');
  const r = await run('INSERT INTO email_campaigns (name, campaign_type, subject, body_html, body_text, trigger_event, delay_hours) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [name, campaign_type, subject, body_html || null, body_text || null, trigger_event || null, delay_hours || 0]);
  res.status(201).json({ campaign: await queryOne('SELECT * FROM email_campaigns WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.put('/campaigns/:id', async (req, res) => {
  const fields = ['name', 'campaign_type', 'subject', 'body_html', 'body_text', 'trigger_event', 'delay_hours', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; } }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE email_campaigns SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
  res.json({ campaign: await queryOne('SELECT * FROM email_campaigns WHERE id = $1', [req.params.id]) });
});

// ─── NPS surveys ────────────────────────────────

adminRouter.get('/nps', async (req, res) => {
  const surveys = await queryAll(`SELECT ns.*, u.name, u.email, s.name as service_name FROM nps_surveys ns JOIN users u ON ns.user_id = u.id JOIN appointments a ON ns.appointment_id = a.id JOIN services s ON a.service_id = s.id ORDER BY ns.responded_at DESC LIMIT 100`);
  res.json({ surveys });
});

// ─── Abandoned bookings ─────────────────────────

adminRouter.get('/abandoned', async (req, res) => {
  res.json({ abandoned: await queryAll('SELECT ab.*, u.name, u.email FROM abandoned_bookings ab LEFT JOIN users u ON ab.user_id = u.id ORDER BY ab.created_at DESC LIMIT 50') });
});

adminRouter.post('/abandoned/recover', async (req, res) => {
  const { id } = req.body;
  if (!id) return sendValidationError(res, 'id is required');
  await run('UPDATE abandoned_bookings SET recovery_sent = 1 WHERE id = $1', [id]);
  res.json({ message: 'Recovery email queued' });
});

router.use('/admin', adminRouter);

module.exports = router;
