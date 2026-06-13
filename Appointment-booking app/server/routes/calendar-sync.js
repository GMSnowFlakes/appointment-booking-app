/**
 * Google Calendar Sync Route
 *
 * GET    /api/calendar/auth         Get Google OAuth URL
 * POST   /api/calendar/auth/callback  Handle OAuth callback + store tokens
 * POST   /api/calendar/sync         Sync appointment to Google Calendar
 * DELETE /api/calendar/event/:id    Remove synced event
 * GET    /api/calendar/status       Check sync status
 */

const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendNotFoundError } = require('../errors');

const router = express.Router();

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// ─── Get OAuth URL ────────────────────────────────────

router.get('/auth', authenticateToken, async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.json({
      configured: false,
      message: 'Google Calendar sync requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
    });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${req.user.id}`;

  res.json({
    configured: true,
    auth_url: authUrl,
  });
});

// ─── Handle OAuth Callback ────────────────────────────

router.post('/auth/callback', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return sendError(res, 400, 'Authorization code is required');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return sendError(res, 503, 'Google Calendar not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      return sendError(res, 400, 'Failed to exchange authorization code');
    }

    // Store tokens
    await run(`
      INSERT INTO calendar_tokens (user_id, access_token, refresh_token, token_type, scope, expiry_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET access_token = $2, refresh_token = COALESCE($3, calendar_tokens.refresh_token),
                    token_type = $4, scope = $5, expiry_date = $6, updated_at = NOW()
    `, [
      req.user.id,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.token_type || 'Bearer',
      tokens.scope || SCOPES,
      tokens.expiry_date ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    ]);

    logger.info({ userId: req.user.id }, 'Google Calendar connected');
    res.json({ success: true, message: 'Google Calendar connected successfully' });
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback failed');
    sendError(res, 500, 'Failed to connect Google Calendar');
  }
});

// ─── Sync appointment to Calendar ─────────────────────

router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) return sendError(res, 400, 'appointment_id is required');

    const appointment = await queryOne(`
      SELECT a.*, s.name as service_name, s.duration, s.price
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [appointment_id, req.user.id]);

    if (!appointment) return sendNotFoundError(res, 'Appointment not found');

    // Get calendar tokens
    const tokens = await queryOne('SELECT * FROM calendar_tokens WHERE user_id = $1', [req.user.id]);
    if (!tokens || !tokens.access_token) {
      return sendError(res, 401, 'Google Calendar not connected. Please connect first.');
    }

    // Check if already synced
    const existing = await queryOne(
      'SELECT * FROM calendar_events WHERE appointment_id = $1 AND user_id = $2',
      [appointment.id, req.user.id]
    );

    const startDateTime = `${appointment.date}T${appointment.time}:00`;
    const endDate = new Date(`${appointment.date}T${appointment.time}:00`);
    endDate.setMinutes(endDate.getMinutes() + appointment.duration);
    const endDateTime = endDate.toISOString();

    const eventBody = {
      summary: appointment.service_name,
      description: appointment.notes || 'Appointment booking',
      start: { dateTime: startDateTime, timeZone: 'America/New_York' },
      end: { dateTime: endDateTime, timeZone: 'America/New_York' },
    };

    if (existing) {
      // Update existing event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tokens.calendar_id || 'primary')}/events/${existing.google_event_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errData = await response.text();
        return sendError(res, 500, `Google Calendar API error: ${errData}`);
      }

      await run('UPDATE calendar_events SET updated_at = NOW() WHERE id = $1', [existing.id]);
    } else {
      // Create new event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tokens.calendar_id || 'primary')}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errData = await response.text();
        return sendError(res, 500, `Google Calendar API error: ${errData}`);
      }

      const event = await response.json();

      await run(`
        INSERT INTO calendar_events (appointment_id, user_id, google_event_id, calendar_id)
        VALUES ($1, $2, $3, $4)
      `, [appointment.id, req.user.id, event.id, tokens.calendar_id || 'primary']);
    }

    // Update last synced
    await run('UPDATE calendar_tokens SET last_synced_at = NOW() WHERE user_id = $1', [req.user.id]);

    logger.info({ appointmentId: appointment.id }, 'Synced to Google Calendar');
    res.json({ success: true, message: 'Synced to Google Calendar' });
  } catch (err) {
    logger.error({ err }, 'Calendar sync failed');
    sendError(res, 500, err.message || 'Failed to sync to calendar');
  }
});

// ─── Remove synced event ──────────────────────────────

router.delete('/event/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const event = await queryOne(
      'SELECT * FROM calendar_events WHERE appointment_id = $1 AND user_id = $2',
      [req.params.appointmentId, req.user.id]
    );

    if (!event) return sendNotFoundError(res, 'No synced event found');

    // Delete from Google Calendar
    const tokens = await queryOne('SELECT * FROM calendar_tokens WHERE user_id = $1', [req.user.id]);
    if (tokens?.access_token) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.calendar_id)}/events/${event.google_event_id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        }
      ).catch(() => {}); // Ignore errors on delete
    }

    await run('DELETE FROM calendar_events WHERE id = $1', [event.id]);
    res.json({ success: true, message: 'Event removed from calendar' });
  } catch (err) {
    logger.error({ err }, 'Failed to remove calendar event');
    sendError(res, 500, 'Failed to remove calendar event');
  }
});

// ─── Sync Status ──────────────────────────────────────

router.get('/status', authenticateToken, async (req, res) => {
  const tokens = await queryOne('SELECT * FROM calendar_tokens WHERE user_id = $1', [req.user.id]);
  const syncedEvents = await queryAll(`
    SELECT ce.*, a.date, a.time, s.name as service_name
    FROM calendar_events ce
    JOIN appointments a ON ce.appointment_id = a.id
    JOIN services s ON a.service_id = s.id
    WHERE ce.user_id = $1
    ORDER BY ce.updated_at DESC
  `, [req.user.id]);

  res.json({
    connected: !!tokens,
    last_synced_at: tokens?.last_synced_at || null,
    synced_events: syncedEvents,
  });
});

module.exports = router;
