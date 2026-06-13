/**
 * Waiting List Route
 *
 * POST   /api/waiting-list/join     Join waiting list for a slot
 * POST   /api/waiting-list/leave    Leave waiting list
 * GET    /api/waiting-list/mine     Get user's waiting list entries
 * GET    /api/admin/waiting-list    Admin: view all waiting entries
 * POST   /api/admin/waiting-list/notify  Admin: manually notify next in line
 */

const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError } = require('../errors');

const router = express.Router();

// ─── Join Waiting List ────────────────────────────────

router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { service_id, staff_id, preferred_date, preferred_time_from, preferred_time_to } = req.body;
    if (!service_id) return sendValidationError(res, 'service_id is required');

    // Check if already waiting
    const existing = await queryOne(`
      SELECT id FROM waiting_list
      WHERE user_id = $1 AND service_id = $2
      AND (staff_id IS NULL AND $3 IS NULL OR staff_id = $3)
      AND status = 'waiting'
    `, [req.user.id, service_id, staff_id || null]);

    if (existing) return sendError(res, 409, 'You are already on the waiting list for this service');

    // Set expiry (default 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await run(`
      INSERT INTO waiting_list (user_id, service_id, staff_id, preferred_date, preferred_time_from, preferred_time_to, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [req.user.id, service_id, staff_id || null, preferred_date || null, preferred_time_from || null, preferred_time_to || null, expiresAt]);

    logger.info({ userId: req.user.id, serviceId: service_id }, 'Joined waiting list');

    const entry = await queryOne('SELECT * FROM waiting_list WHERE id = $1', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Added to waiting list', entry });
  } catch (err) {
    logger.error({ err }, 'Failed to join waiting list');
    sendError(res, 500, err.message || 'Failed to join waiting list');
  }
});

// ─── Leave Waiting List ───────────────────────────────

router.post('/leave', authenticateToken, async (req, res) => {
  const { waiting_list_id } = req.body;
  if (!waiting_list_id) return sendValidationError(res, 'waiting_list_id is required');

  const result = await run(
    `UPDATE waiting_list SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'waiting'`,
    [waiting_list_id, req.user.id]
  );

  res.json({ message: result.rowCount > 0 ? 'Left waiting list' : 'Not found on waiting list' });
});

// ─── My Waiting List ──────────────────────────────────

router.get('/mine', authenticateToken, async (req, res) => {
  const entries = await queryAll(`
    SELECT wl.*, s.name as service_name, s.category, s.duration, s.price
    FROM waiting_list wl
    JOIN services s ON wl.service_id = s.id
    WHERE wl.user_id = $1
    ORDER BY wl.created_at DESC
  `, [req.user.id]);

  res.json({ entries });
});

module.exports = router;
