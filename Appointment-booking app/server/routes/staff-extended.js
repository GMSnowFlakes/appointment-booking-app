/**
 * Staff Extended Management Route
 * Leave requests, shifts, clock-in/out, portfolio, certifications, documents
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();
const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

// ─── Leave requests ─────────────────────────────────

adminRouter.get('/:staffId/leave', async (req, res) => {
  const leaves = await queryAll('SELECT * FROM staff_leave_requests WHERE staff_id = $1 ORDER BY start_date DESC', [req.params.staffId]);
  res.json({ leaves });
});

adminRouter.post('/:staffId/leave', async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  if (!leave_type || !start_date || !end_date) return sendValidationError(res, 'leave_type, start_date, end_date are required');
  const r = await run('INSERT INTO staff_leave_requests (staff_id, leave_type, start_date, end_date, reason) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.params.staffId, leave_type, start_date, end_date, reason || null]);
  const leave = await queryOne('SELECT * FROM staff_leave_requests WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ leave });
});

adminRouter.put('/:staffId/leave/:id', async (req, res) => {
  const { status, approved_by } = req.body;
  if (!status) return sendValidationError(res, 'status is required');
  await run('UPDATE staff_leave_requests SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3 AND staff_id = $4',
    [status, approved_by || null, req.params.id, req.params.staffId]);
  res.json({ message: 'Leave request updated' });
});

// ─── Shifts ─────────────────────────────────────────

adminRouter.get('/:staffId/shifts', async (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT * FROM staff_shifts WHERE staff_id = $1';
  const params = [req.params.staffId];
  if (from && to) { sql += ' AND shift_date >= $2 AND shift_date <= $3'; params.push(from, to); }
  sql += ' ORDER BY shift_date';
  res.json({ shifts: await queryAll(sql, params) });
});

adminRouter.post('/:staffId/shifts', async (req, res) => {
  const { shift_date, start_time, end_time, shift_type, notes } = req.body;
  if (!shift_date || !start_time || !end_time) return sendValidationError(res, 'shift_date, start_time, end_time are required');
  await run(`INSERT INTO staff_shifts (staff_id, shift_date, start_time, end_time, shift_type, notes)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (staff_id, shift_date) DO UPDATE SET start_time=$3, end_time=$4, shift_type=$5, notes=$6`,
    [req.params.staffId, shift_date, start_time, end_time, shift_type || 'regular', notes || null]);
  res.json({ message: 'Shift saved' });
});

adminRouter.delete('/:staffId/shifts/:id', async (req, res) => {
  await run('DELETE FROM staff_shifts WHERE id = $1 AND staff_id = $2', [req.params.id, req.params.staffId]);
  res.json({ message: 'Shift deleted' });
});

// ─── Clock entries ─────────────────────────────────

adminRouter.get('/:staffId/clock', async (req, res) => {
  const entries = await queryAll('SELECT * FROM staff_clock_entries WHERE staff_id = $1 ORDER BY clock_in DESC LIMIT 100', [req.params.staffId]);
  res.json({ clock_entries: entries });
});

adminRouter.post('/:staffId/clock/in', async (req, res) => {
  const r = await run('INSERT INTO staff_clock_entries (staff_id, clock_in) VALUES ($1, NOW()) RETURNING id', [req.params.staffId]);
  const entry = await queryOne('SELECT * FROM staff_clock_entries WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ clock_entry: entry });
});

adminRouter.post('/:staffId/clock/out', async (req, res) => {
  const active = await queryOne('SELECT * FROM staff_clock_entries WHERE staff_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1', [req.params.staffId]);
  if (!active) return sendError(res, 400, 'No active clock entry');
  const duration = Math.round((Date.now() - new Date(active.clock_in).getTime()) / 60000);
  await run('UPDATE staff_clock_entries SET clock_out = NOW(), duration_minutes = $1 WHERE id = $2', [duration, active.id]);
  const entry = await queryOne('SELECT * FROM staff_clock_entries WHERE id = $1', [active.id]);
  res.json({ clock_entry: entry });
});

// ─── Portfolio ─────────────────────────────────────

adminRouter.get('/:staffId/portfolio', async (req, res) => {
  res.json({ portfolio: await queryAll('SELECT * FROM staff_portfolio_items WHERE staff_id = $1 ORDER BY sort_order', [req.params.staffId]) });
});

adminRouter.post('/:staffId/portfolio', async (req, res) => {
  const { title, description, image_url, category, is_featured } = req.body;
  if (!image_url) return sendValidationError(res, 'image_url is required');
  const r = await run('INSERT INTO staff_portfolio_items (staff_id, title, description, image_url, category, is_featured) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.params.staffId, title || null, description || null, image_url, category || null, is_featured ? 1 : 0]);
  const item = await queryOne('SELECT * FROM staff_portfolio_items WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ portfolio_item: item });
});

adminRouter.delete('/:staffId/portfolio/:id', async (req, res) => {
  await run('DELETE FROM staff_portfolio_items WHERE id = $1 AND staff_id = $2', [req.params.id, req.params.staffId]);
  res.json({ message: 'Portfolio item deleted' });
});

// ─── Certifications ───────────────────────────────

adminRouter.get('/:staffId/certifications', async (req, res) => {
  res.json({ certifications: await queryAll('SELECT * FROM staff_certifications WHERE staff_id = $1 ORDER BY issue_date DESC', [req.params.staffId]) });
});

adminRouter.post('/:staffId/certifications', async (req, res) => {
  const { name, issuer, credential_id, issue_date, expiry_date, file_url } = req.body;
  if (!name) return sendValidationError(res, 'name is required');
  const r = await run('INSERT INTO staff_certifications (staff_id, name, issuer, credential_id, issue_date, expiry_date, file_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [req.params.staffId, name, issuer || null, credential_id || null, issue_date || null, expiry_date || null, file_url || null]);
  const cert = await queryOne('SELECT * FROM staff_certifications WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ certification: cert });
});

adminRouter.delete('/:staffId/certifications/:id', async (req, res) => {
  await run('DELETE FROM staff_certifications WHERE id = $1 AND staff_id = $2', [req.params.id, req.params.staffId]);
  res.json({ message: 'Certification deleted' });
});

// ─── Documents ────────────────────────────────────

adminRouter.get('/:staffId/documents', async (req, res) => {
  res.json({ documents: await queryAll('SELECT * FROM staff_documents WHERE staff_id = $1 ORDER BY created_at DESC', [req.params.staffId]) });
});

adminRouter.post('/:staffId/documents', async (req, res) => {
  const { name, file_url, document_type, notes } = req.body;
  if (!name || !file_url) return sendValidationError(res, 'name and file_url are required');
  const r = await run('INSERT INTO staff_documents (staff_id, name, file_url, document_type, notes, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.params.staffId, name, file_url, document_type || 'other', notes || null, req.user?.id || null]);
  const doc = await queryOne('SELECT * FROM staff_documents WHERE id = $1', [r.lastInsertRowid]);
  res.status(201).json({ document: doc });
});

adminRouter.delete('/:staffId/documents/:id', async (req, res) => {
  await run('DELETE FROM staff_documents WHERE id = $1 AND staff_id = $2', [req.params.id, req.params.staffId]);
  res.json({ message: 'Document deleted' });
});

// ─── Buffer settings ──────────────────────────────

adminRouter.get('/buffer-settings', async (req, res) => {
  res.json({ buffers: await queryAll('SELECT * FROM buffer_settings ORDER BY staff_id NULLS FIRST') });
});

adminRouter.post('/buffer-settings', async (req, res) => {
  const { staff_id, before_minutes, after_minutes, applies_to } = req.body;
  await run(`INSERT INTO buffer_settings (staff_id, before_minutes, after_minutes, applies_to)
    VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    [staff_id || null, before_minutes || 0, after_minutes || 0, applies_to || 'all']);
  res.json({ message: 'Buffer settings saved' });
});

// ─── Break tracking ──────────────────────────────

adminRouter.post('/:staffId/clock/break-start', async (req, res) => {
  const activeEntry = await queryOne('SELECT * FROM staff_clock_entries WHERE staff_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1', [req.params.staffId]);
  if (!activeEntry) return sendError(res, 400, 'No active clock entry');
  const activeBreak = await queryOne('SELECT * FROM staff_breaks WHERE clock_entry_id = $1 AND break_end IS NULL', [activeEntry.id]);
  if (activeBreak) return sendError(res, 400, 'Break already in progress');
  const r = await run('INSERT INTO staff_breaks (clock_entry_id, break_start, break_type) VALUES ($1, NOW(), $2) RETURNING id',
    [activeEntry.id, req.body.break_type || 'lunch']);
  res.status(201).json({ break_entry: await queryOne('SELECT * FROM staff_breaks WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.post('/:staffId/clock/break-end', async (req, res) => {
  const activeEntry = await queryOne('SELECT * FROM staff_clock_entries WHERE staff_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1', [req.params.staffId]);
  if (!activeEntry) return sendError(res, 400, 'No active clock entry');
  const activeBreak = await queryOne('SELECT * FROM staff_breaks WHERE clock_entry_id = $1 AND break_end IS NULL', [activeEntry.id]);
  if (!activeBreak) return sendError(res, 400, 'No active break');
  const duration = Math.round((Date.now() - new Date(activeBreak.break_start).getTime()) / 60000);
  await run('UPDATE staff_breaks SET break_end = NOW(), duration_minutes = $1 WHERE id = $2', [duration, activeBreak.id]);
  res.json({ break_entry: await queryOne('SELECT * FROM staff_breaks WHERE id = $1', [activeBreak.id]) });
});

router.use('/admin/staff', adminRouter);

module.exports = router;
