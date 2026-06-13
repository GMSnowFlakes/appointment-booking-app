/**
 * Video Conferencing Route — Zoom / Google Meet auto-link on booking
 *
 * POST   /api/video/create    Create a video meeting link for an appointment
 * GET    /api/video/:appointmentId  Get meeting details
 */

const express = require('express');
const { queryOne, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Create Video Meeting ─────────────────────────────

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { appointment_id, provider = 'google_meet' } = req.body;
    if (!appointment_id) return sendError(res, 400, 'appointment_id is required');

    const appointment = await queryOne(`
      SELECT a.*, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [appointment_id, req.user.id]);

    if (!appointment) return sendNotFoundError(res, 'Appointment not found');

    // Check if meeting already exists
    const existing = await queryOne('SELECT * FROM video_meetings WHERE appointment_id = $1', [appointment.id]);
    if (existing) {
      return res.json({ meeting: existing });
    }

    let meetingUrl = '';
    let meetingId = '';
    let passcode = '';
    let startUrl = '';

    if (provider === 'google_meet') {
      // Google Meet links are simple: https://meet.google.com/new
      // In production, use Google Calendar API to create a scheduled meet
      meetingId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      meetingUrl = `https://meet.google.com/${meetingId}`;
    } else if (provider === 'zoom' && process.env.ZOOM_API_KEY) {
      // Zoom API integration would go here
      // For now, generate a placeholder link
      meetingId = `${Math.floor(Math.random() * 1000000000)}`;
      meetingUrl = `https://zoom.us/j/${meetingId}`;
      passcode = Math.random().toString(36).slice(2, 8).toUpperCase();
    } else {
      // Default: generate a unique room name
      meetingId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      meetingUrl = `/video/${meetingId}`;
    }

    const result = await run(`
      INSERT INTO video_meetings (appointment_id, provider, meeting_url, meeting_id, passcode, start_url)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [appointment.id, provider, meetingUrl, meetingId, passcode || null, startUrl || null]);

    // Update appointment with video URL
    await run('UPDATE appointments SET video_url = $1 WHERE id = $2', [meetingUrl, appointment.id]);

    const meeting = await queryOne('SELECT * FROM video_meetings WHERE id = $1', [result.lastInsertRowid]);

    logger.info({ appointmentId: appointment.id, provider }, 'Video meeting created');
    res.status(201).json({ meeting });
  } catch (err) {
    logger.error({ err }, 'Failed to create video meeting');
    sendError(res, 500, err.message || 'Failed to create video meeting');
  }
});

// ─── Get Meeting Details ──────────────────────────────

router.get('/:appointmentId', authenticateToken, async (req, res) => {
  const meeting = await queryOne(`
    SELECT vm.*, a.date, a.time, a.status,
           s.name as service_name, s.duration,
           u.name as customer_name
    FROM video_meetings vm
    JOIN appointments a ON vm.appointment_id = a.id
    JOIN services s ON a.service_id = s.id
    JOIN users u ON a.user_id = u.id
    WHERE vm.appointment_id = $1 AND (a.user_id = $2 OR $3 = 'admin')
  `, [req.params.appointmentId, req.user.id, req.user.role]);

  if (!meeting) return sendNotFoundError(res, 'Meeting not found');
  res.json({ meeting });
});

module.exports = router;
