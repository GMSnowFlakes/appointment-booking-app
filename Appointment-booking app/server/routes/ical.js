/**
 * iCal Feed Route — Serves appointment data as .ics format (RFC 5545)
 *
 * GET    /api/ical/:token    Public: .ics calendar feed for a user's appointments
 * POST   /api/ical/tokens    Admin: create ical token (moved from admin-extended)
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendNotFoundError } = require('../errors');

const router = express.Router();

/**
 * Escape special characters in ical text values.
 * RFC 5545 requires: \, ; , \n to be escaped.
 */
function icalEscape(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format a Date as an iCal datetime string: YYYYMMDDTHHMMSSZ
 */
function icalDate(dateStr, timeStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (timeStr) {
    const [hh, mm] = timeStr.split(':').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  // All-day event format: YYYYMMDD
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

/**
 * Get the current UTC timestamp in iCal format.
 */
function icalNow() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate a stable UID for an appointment using its creation timestamp.
 * This ensures UIDs don't change between feed fetches, preventing duplicates.
 */
function makeUid(appointmentId, createdAt) {
  const ts = createdAt
    ? new Date(createdAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    : appointmentId;
  return `${appointmentId}-${ts}@appointmentbook`;
}

// ─── Chunk lines to max 75 octets per RFC 5545 ────

function foldLine(line) {
  if (line.length <= 75) return line + '\r\n';
  const chunks = [];
  chunks.push(line.slice(0, 75));
  let remaining = line.slice(75);
  while (remaining.length > 0) {
    // Continuation lines start with a single space
    chunks.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join('\r\n') + '\r\n';
}

// ─── GET /api/ical/:token — Serve .ics feed ───────

router.get('/:token', async (req, res) => {
  try {
    // Validate token
    const icalToken = await queryOne(
      'SELECT * FROM ical_tokens WHERE token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!icalToken) return sendNotFoundError(res, 'Invalid or expired calendar token');

    // Fetch business name from settings and timezone from default location
    const settings = await queryOne('SELECT business_name FROM business_settings LIMIT 1');
    const location = await queryOne("SELECT timezone FROM locations WHERE is_active = 1 LIMIT 1");
    const businessName = settings?.business_name || 'Appointment Book';
    const tz = location?.timezone || 'America/New_York';

    // Fetch user's appointments
    const appointments = await queryAll(`
      SELECT
        a.id, a.date, a.time, a.status, a.notes, a.created_at,
        s.name as service_name, s.duration as service_duration, s.price as service_price,
        u.name as user_name, u.email as user_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1
      ORDER BY a.date ASC, a.time ASC
    `, [icalToken.user_id]);

    // Build VCALENDAR
    let ics = 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += foldLine(`PRODID:-//AppointmentBook//${icalEscape(businessName)}//EN`);
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += foldLine(`X-WR-CALNAME:${icalEscape(businessName)} - Appointments`);
    ics += foldLine(`X-WR-CALDESC:Appointments from ${icalEscape(businessName)}`);
    ics += foldLine(`X-WR-TIMEZONE:${tz}`);

    for (const apt of appointments) {
      // Skip cancelled appointments
      if (apt.status === 'cancelled') continue;

      const startDate = icalDate(apt.date, apt.time);
      const endMinutes = (() => {
        const [h, m] = apt.time.split(':').map(Number);
        const total = h * 60 + m + (apt.service_duration || 60);
        const eh = Math.floor(total / 60) % 24;
        const em = total % 60;
        return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
      })();
      const endDate = icalDate(apt.date, endMinutes);

      const summary = `${apt.service_name}${apt.user_name ? ` - ${apt.user_name}` : ''}`;
      const description = [];
      if (apt.service_name) description.push(`Service: ${apt.service_name}`);
      if (apt.service_duration) description.push(`Duration: ${apt.service_duration} min`);
      if (apt.service_price) description.push(`Price: $${parseFloat(apt.service_price).toFixed(2)}`);
      if (apt.user_name) description.push(`Customer: ${apt.user_name}`);
      if (apt.user_email) description.push(`Email: ${apt.user_email}`);
      if (apt.status) description.push(`Status: ${apt.status}`);
      if (apt.notes) description.push(`Notes: ${apt.notes}`);

      ics += 'BEGIN:VEVENT\r\n';
      ics += foldLine(`UID:${makeUid(apt.id, apt.created_at)}`);
      ics += foldLine(`DTSTAMP:${icalNow()}`);
      ics += foldLine(`DTSTART:${startDate}`);
      ics += foldLine(`DTEND:${endDate}`);
      ics += foldLine(`SUMMARY:${icalEscape(summary)}`);
      ics += foldLine(`DESCRIPTION:${icalEscape(description.join('\\n'))}`);
      ics += foldLine(`STATUS:${apt.status === 'confirmed' ? 'CONFIRMED' : apt.status === 'completed' ? 'COMPLETED' : 'TENTATIVE'}`);
      ics += 'END:VEVENT\r\n';
    }

    ics += 'END:VCALENDAR\r\n';

    // Track that feed was accessed
    await run('UPDATE ical_tokens SET is_active = 1 WHERE id = $1', [icalToken.id]);

    logger.info({ userId: icalToken.user_id, appointmentCount: appointments.length }, 'iCal feed served');

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="appointments.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.send(ics);
  } catch (err) {
    logger.error({ err }, 'Failed to generate iCal feed');
    sendError(res, 500, 'Failed to generate calendar feed');
  }
});

// ─── iCal token management endpoints ──────────────

router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const tokens = await queryAll(
      'SELECT id, token, calendar_type, is_active, created_at FROM ical_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ tokens });
  } catch (err) {
    logger.error({ err }, 'Failed to list iCal tokens');
    sendError(res, 500, 'Failed to load tokens');
  }
});

router.post('/tokens', authenticateToken, async (req, res) => {
  try {
    // Deactivate old tokens
    await run('UPDATE ical_tokens SET is_active = 0 WHERE user_id = $1', [req.user.id]);

    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const r = await run(
      'INSERT INTO ical_tokens (user_id, token) VALUES ($1, $2) RETURNING id',
      [req.user.id, token]
    );

    const icalToken = await queryOne('SELECT * FROM ical_tokens WHERE id = $1', [r.lastInsertRowid]);
    const icalUrl = `${req.protocol}://${req.get('host')}/api/ical/${token}`;

    logger.info({ userId: req.user.id }, 'iCal token created');
    res.status(201).json({ token: icalToken, ical_url: icalUrl });
  } catch (err) {
    logger.error({ err }, 'Failed to create iCal token');
    sendError(res, 500, 'Failed to create calendar token');
  }
});

router.delete('/tokens/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await queryOne(
      'SELECT * FROM ical_tokens WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing) return sendNotFoundError(res, 'Token not found');
    await run('UPDATE ical_tokens SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ message: 'Token revoked' });
  } catch (err) {
    logger.error({ err }, 'Failed to revoke iCal token');
    sendError(res, 500, 'Failed to revoke token');
  }
});

module.exports = router;
