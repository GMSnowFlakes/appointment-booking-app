/**
 * Extended Notifications & Communication Route
 * Templates, push subscriptions, in-app messaging, i18n, GDPR
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();
const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

// ─── Notification templates ───────────────────────

adminRouter.get('/templates', async (req, res) => {
  res.json({ templates: await queryAll('SELECT * FROM notification_templates ORDER BY event_type, name') });
});

adminRouter.post('/templates', async (req, res) => {
  const { name, type, event_type, subject, body_template } = req.body;
  if (!name || !type || !event_type || !body_template) return sendValidationError(res, 'name, type, event_type, body_template are required');
  const r = await run('INSERT INTO notification_templates (name, type, event_type, subject, body_template) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [name, type, event_type, subject || null, body_template]);
  res.status(201).json({ template: await queryOne('SELECT * FROM notification_templates WHERE id = $1', [r.lastInsertRowid]) });
});

adminRouter.put('/templates/:id', async (req, res) => {
  const fields = ['name', 'type', 'event_type', 'subject', 'body_template', 'is_active'];
  const updates = []; const params = []; let idx = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; } }
  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE notification_templates SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
  res.json({ template: await queryOne('SELECT * FROM notification_templates WHERE id = $1', [req.params.id]) });
});

// ─── Push subscriptions (user self-service) ──────

router.post('/push/subscribe', authenticateToken, async (req, res) => {
  const { endpoint, p256dh_key, auth_key, device_type } = req.body;
  if (!endpoint || !p256dh_key || !auth_key) return sendValidationError(res, 'endpoint, p256dh_key, auth_key are required');
  await run('INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, device_type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (endpoint) DO UPDATE SET is_active = 1',
    [req.user.id, endpoint, p256dh_key, auth_key, device_type || 'web']);
  res.status(201).json({ message: 'Subscribed to push notifications' });
});

router.delete('/push/unsubscribe', authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) await run('UPDATE push_subscriptions SET is_active = 0 WHERE user_id = $1 AND endpoint = $2', [req.user.id, endpoint]);
  else await run('UPDATE push_subscriptions SET is_active = 0 WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Unsubscribed from push notifications' });
});

// ─── In-app messaging ────────────────────────────

router.get('/conversations', authenticateToken, async (req, res) => {
  const conversations = await queryAll(`
    SELECT c.*, cp.last_read_at, (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = $1
    ORDER BY last_message_at DESC NULLS LAST
  `, [req.user.id]);
  res.json({ conversations });
});

router.post('/conversations', authenticateToken, async (req, res) => {
  const { subject, participant_ids, initial_message } = req.body;
  if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) return sendValidationError(res, 'participant_ids array is required');

  const c = await run('INSERT INTO conversations (subject, created_by) VALUES ($1,$2) RETURNING id', [subject || null, req.user.id]);
  const convId = c.lastInsertRowid;

  // Add all participants including creator
  const allUsers = [...new Set([req.user.id, ...participant_ids])];
  for (const uid of allUsers) {
    await run('INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [convId, uid, uid === req.user.id ? 1 : 0]);
  }

  if (initial_message) {
    await run('INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3)', [convId, req.user.id, initial_message]);
  }

  const conversation = await queryOne('SELECT * FROM conversations WHERE id = $1', [convId]);
  res.status(201).json({ conversation });
});

router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  const isParticipant = await queryOne('SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!isParticipant) return sendError(res, 403, 'Not a participant');

  // Mark as read
  await run('UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2', [req.params.id, req.user.id]);

  const messages = await queryAll(`
    SELECT m.*, u.name as sender_name, u.email as sender_email
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
  `, [req.params.id]);
  res.json({ messages });
});

router.post('/conversations/:id/messages', authenticateToken, async (req, res) => {
  const isParticipant = await queryOne('SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!isParticipant) return sendError(res, 403, 'Not a participant');

  const { content, message_type, file_url } = req.body;
  if (!content) return sendValidationError(res, 'content is required');

  const r = await run('INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.params.id, req.user.id, content, message_type || 'text', file_url || null]);
  const msg = await queryOne('SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1', [r.lastInsertRowid]);

  // Update conversation timestamp
  await run('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id]);

  res.status(201).json({ message: msg });
});

// ─── i18n / translations ─────────────────────────

router.get('/languages', async (req, res) => {
  res.json({ languages: await queryAll('SELECT * FROM supported_languages WHERE is_active = 1 ORDER BY is_default DESC, name') });
});

router.get('/translations', async (req, res) => {
  const { lang } = req.query;
  if (!lang) return sendValidationError(res, 'lang query param is required');
  const translations = await queryAll('SELECT key, value FROM translations WHERE language_code = $1', [lang]);
  const map = {};
  for (const t of translations) map[t.key] = t.value;
  res.json({ translations: map, language: lang });
});

adminRouter.post('/translations', async (req, res) => {
  const { language_code, key, value } = req.body;
  if (!language_code || !key || !value) return sendValidationError(res, 'language_code, key, value are required');
  await run('INSERT INTO translations (language_code, key, value) VALUES ($1,$2,$3) ON CONFLICT (language_code, key) DO UPDATE SET value = $3, updated_at = NOW()',
    [language_code, key, value]);
  res.json({ message: 'Translation saved' });
});

// ─── GDPR ────────────────────────────────────────

router.post('/gdpr/export', authenticateToken, async (req, res) => {
  await run("INSERT INTO gdpr_requests (user_id, request_type) VALUES ($1, 'data_export')", [req.user.id]);
  res.json({ message: 'Data export requested. You will receive your data via email within 30 days.' });
});

router.post('/gdpr/erasure', authenticateToken, async (req, res) => {
  await run("INSERT INTO gdpr_requests (user_id, request_type) VALUES ($1, 'erasure')", [req.user.id]);
  res.json({ message: 'Account deletion requested. You will be contacted to confirm.' });
});

adminRouter.get('/gdpr-requests', async (req, res) => {
  res.json({ requests: await queryAll('SELECT gr.*, u.name, u.email FROM gdpr_requests gr JOIN users u ON gr.user_id = u.id ORDER BY gr.requested_at DESC') });
});

adminRouter.put('/gdpr-requests/:id', async (req, res) => {
  const { status, notes } = req.body;
  await run('UPDATE gdpr_requests SET status = $1, completed_at = CASE WHEN $1 = \'completed\' THEN NOW() ELSE NULL END, notes = $2 WHERE id = $3',
    [status, notes || null, req.params.id]);
  res.json({ message: 'GDPR request updated' });
});

router.use('/admin', adminRouter);

module.exports = router;
