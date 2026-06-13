/**
 * Webhooks Route — outgoing webhook management
 *
 * GET    /api/admin/webhooks              List endpoints
 * POST   /api/admin/webhooks              Create endpoint
 * PUT    /api/admin/webhooks/:id          Update endpoint
 * DELETE /api/admin/webhooks/:id          Delete endpoint
 * GET    /api/admin/webhooks/log          Delivery log
 * POST   /api/admin/webhooks/test/:id     Test send
 *
 * Also exports: dispatchWebhook(eventType, payload)
 */
const crypto = require('crypto');
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();
const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

// ─── List endpoints ─────────────────────────────────

adminRouter.get('/', async (req, res) => {
  try {
    const endpoints = await queryAll('SELECT * FROM webhook_endpoints ORDER BY created_at DESC');
    res.json({ endpoints });
  } catch (err) {
    logger.error({ err }, 'Failed to list webhook endpoints');
    sendError(res, 500, 'Failed to load webhook endpoints');
  }
});

// ─── Create endpoint ────────────────────────────────

adminRouter.post('/', async (req, res) => {
  try {
    const { name, url, events, secret } = req.body;
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return sendValidationError(res, 'url and events (non-empty array) are required');
    }

    const webhookSecret = secret || crypto.randomBytes(16).toString('hex');
    const result = await run(`
      INSERT INTO webhook_endpoints (name, url, secret, events)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name || null, url, webhookSecret, events]);

    const ep = await queryOne('SELECT * FROM webhook_endpoints WHERE id = $1', [result.lastInsertRowid]);
    logger.info({ endpointId: ep?.id, url }, 'Webhook endpoint created');
    res.status(201).json({ message: 'Webhook endpoint created', endpoint: ep });
  } catch (err) {
    logger.error({ err }, 'Failed to create webhook endpoint');
    sendError(res, 500, 'Failed to create webhook endpoint');
  }
});

// ─── Update endpoint ────────────────────────────────

adminRouter.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM webhook_endpoints WHERE id = $1', [req.params.id]);
    if (!existing) return sendNotFoundError(res, 'Webhook endpoint not found');

    const fields = ['name', 'url', 'events', 'is_active', 'secret'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'events') {
          if (!Array.isArray(req.body[f])) continue;
          updates.push(`${f} = $${idx}`);
          params.push(req.body[f]);
        } else {
          updates.push(`${f} = $${idx}`);
          params.push(req.body[f]);
        }
        idx++;
      }
    }

    if (updates.length === 0) return sendValidationError(res, 'No fields to update');
    params.push(req.params.id);
    await run(`UPDATE webhook_endpoints SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);

    const ep = await queryOne('SELECT * FROM webhook_endpoints WHERE id = $1', [req.params.id]);
    res.json({ message: 'Webhook endpoint updated', endpoint: ep });
  } catch (err) {
    logger.error({ err }, 'Failed to update webhook endpoint');
    sendError(res, 500, 'Failed to update webhook endpoint');
  }
});

// ─── Delete endpoint ────────────────────────────────

adminRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM webhook_endpoints WHERE id = $1', [req.params.id]);
    if (!existing) return sendNotFoundError(res, 'Webhook endpoint not found');
    await run('DELETE FROM webhook_endpoints WHERE id = $1', [req.params.id]);
    await run('DELETE FROM webhook_deliveries WHERE endpoint_id = $1', [req.params.id]);
    res.json({ message: 'Webhook endpoint deleted' });
  } catch (err) {
    logger.error({ err }, 'Failed to delete webhook endpoint');
    sendError(res, 500, 'Failed to delete webhook endpoint');
  }
});

// ─── Delivery log ───────────────────────────────────

adminRouter.get('/log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const deliveries = await queryAll(`
      SELECT wd.*, we.name as endpoint_name, we.url
      FROM webhook_deliveries wd
      JOIN webhook_endpoints we ON wd.endpoint_id = we.id
      ORDER BY wd.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json({ deliveries });
  } catch (err) {
    logger.error({ err }, 'Failed to list webhook deliveries');
    sendError(res, 500, 'Failed to load delivery log');
  }
});

// ─── Test send ──────────────────────────────────────

adminRouter.post('/test/:id', async (req, res) => {
  try {
    const ep = await queryOne('SELECT * FROM webhook_endpoints WHERE id = $1 AND is_active = 1', [req.params.id]);
    if (!ep) return sendNotFoundError(res, 'Active endpoint not found');

    const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'This is a test webhook' } };
    const result = await sendWebhook(ep, 'test', payload);

    res.json({ success: result.success, status: result.status, duration_ms: result.duration_ms });
  } catch (err) {
    logger.error({ err }, 'Test webhook failed');
    sendError(res, 500, 'Test webhook failed');
  }
});

router.use('/admin', adminRouter);

// ─── Webhook dispatcher ─────────────────────────────

async function sendWebhook(endpoint, eventType, payload) {
  const start = Date.now();
  try {
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', endpoint.secret || '').update(body).digest('hex');

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'User-Agent': 'AppointmentBooking/1.0',
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    const duration = Date.now() - start;
    const responseBody = await response.text().catch(() => '');

    await run(`
      INSERT INTO webhook_deliveries (endpoint_id, event_type, payload, response_status, response_body, success, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [endpoint.id, eventType, JSON.stringify(payload), response.status, responseBody.slice(0, 1000), response.ok ? 1 : 0, duration]);

    if (!response.ok) {
      await run('UPDATE webhook_endpoints SET failure_count = failure_count + 1, last_sent_at = NOW() WHERE id = $1', [endpoint.id]);
    } else {
      await run('UPDATE webhook_endpoints SET failure_count = 0, last_sent_at = NOW() WHERE id = $1', [endpoint.id]);
    }

    return { success: response.ok, status: response.status, duration_ms: duration };
  } catch (err) {
    const duration = Date.now() - start;
    await run(`
      INSERT INTO webhook_deliveries (endpoint_id, event_type, payload, response_status, response_body, success, duration_ms)
      VALUES ($1, $2, $3, $4, $5, 0, $6)
    `, [endpoint.id, eventType, JSON.stringify(payload), 0, err.message.slice(0, 1000), duration]);

    await run('UPDATE webhook_endpoints SET failure_count = failure_count + 1, last_sent_at = NOW() WHERE id = $1', [endpoint.id]);
    return { success: false, status: 0, duration_ms: duration };
  }
}

/**
 * dispatchWebhook — Find all active endpoints subscribed to an event and send.
 * Non-blocking; errors are logged but not thrown.
 */
async function dispatchWebhook(eventType, payload) {
  try {
    const endpoints = await queryAll(
      'SELECT * FROM webhook_endpoints WHERE is_active = 1',
    );

    for (const ep of endpoints) {
      if (ep.events && ep.events.includes(eventType)) {
        sendWebhook(ep, eventType, payload).catch(err => {
          logger.error({ err, endpointId: ep.id, eventType }, 'Webhook dispatch failed');
        });
      }
    }
  } catch (err) {
    logger.error({ err, eventType }, 'Webhook dispatch error');
  }
}

module.exports = { router, dispatchWebhook };
