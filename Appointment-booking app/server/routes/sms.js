/**
 * SMS Notifications Route — Twilio integration
 *
 * POST   /api/sms/send          Send an SMS (triggered by appointment events)
 * POST   /api/user/sms-preferences  Update SMS notification preferences
 * GET    /api/user/sms-preferences  Get SMS preferences
 */

const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError } = require('../errors');

const router = express.Router();

// ─── Twilio client (lazy-loaded) ──────────────────────

let twilioClient = null;
function getTwilio() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

// ─── Send SMS (internal, called by appointment hooks) ──

async function sendSms(userId, appointmentId, messageType, body) {
  try {
    const prefs = await queryOne('SELECT * FROM sms_preferences WHERE user_id = $1', [userId]);
    if (!prefs || !prefs.phone) {
      logger.info({ userId }, 'SMS not sent: no phone number');
      return null;
    }

    // Check opt-in based on message type
    const optInMap = {
      reminder: prefs.sms_reminders,
      confirmation: prefs.sms_confirmation,
      cancellation: prefs.sms_cancellation,
      reschedule: prefs.sms_reschedule,
    };
    if (optInMap[messageType] === 0) {
      logger.info({ userId, messageType }, 'SMS not sent: opted out');
      return null;
    }

    const twilio = getTwilio();
    let twilioSid = null;
    let status = 'sent';

    if (twilio && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const message = await twilio.messages.create({
          body,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: prefs.phone,
        });
        twilioSid = message.sid;
        status = message.status;
      } catch (twilioErr) {
        logger.error({ err: twilioErr, userId }, 'Twilio send failed');
        status = 'failed';
      }
    } else {
      logger.info({ userId, to: prefs.phone, body }, `[DEV SMS] ${body}`);
    }

    // Log SMS
    await run(`
      INSERT INTO sms_log (user_id, appointment_id, to_phone, message_type, body, twilio_sid, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, appointmentId, prefs.phone, messageType, body, twilioSid, status]);

    return { sid: twilioSid, status };
  } catch (err) {
    logger.error({ err, userId, messageType }, 'SMS sending failed');
    return null;
  }
}

// ─── Send SMS (API endpoint) ─────────────────────────

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { appointment_id, message_type } = req.body;
    if (!appointment_id || !message_type) {
      return sendValidationError(res, 'appointment_id and message_type are required');
    }

    const appointment = await queryOne(`
      SELECT a.*, s.name as service_name, s.duration, s.price,
             u.name as user_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [appointment_id]);

    if (!appointment) return sendError(res, 404, 'Appointment not found');

    const date = new Date(`${appointment.date}T${appointment.time}`);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit'
    });

    const messageTemplates = {
      confirmation: `✅ Booking Confirmed: ${appointment.service_name} on ${formattedDate} at ${formattedTime}. Duration: ${appointment.duration}min.`,
      reminder: `⏰ Reminder: ${appointment.service_name} tomorrow (${formattedDate}) at ${formattedTime}. See you soon!`,
      cancellation: `❌ Cancelled: ${appointment.service_name} on ${formattedDate} at ${formattedTime} has been cancelled.`,
      reschedule: `🔄 Rescheduled: ${appointment.service_name} moved to ${formattedDate} at ${formattedTime}.`,
      status_change: `📋 Status Update: ${appointment.service_name} on ${formattedDate} - ${appointment.status}.`,
    };

    const body = messageTemplates[message_type] || `Update for ${appointment.service_name} on ${formattedDate}.`;

    const result = await sendSms(appointment.user_id, appointment.id, message_type, body);
    res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, 'SMS send failed');
    sendError(res, 500, err.message || 'Failed to send SMS');
  }
});

// ─── User SMS Preferences ────────────────────────────

router.get('/preferences', authenticateToken, async (req, res) => {
  let prefs = await queryOne('SELECT * FROM sms_preferences WHERE user_id = $1', [req.user.id]);
  if (!prefs) {
    // Create default preferences
    const result = await run(`
      INSERT INTO sms_preferences (user_id) VALUES ($1) RETURNING id
    `, [req.user.id]);
    prefs = await queryOne('SELECT * FROM sms_preferences WHERE id = $1', [result.lastInsertRowid]);
  }
  res.json({ preferences: prefs });
});

router.post('/preferences', authenticateToken, async (req, res) => {
  const { phone, sms_reminders, sms_confirmation, sms_cancellation, sms_reschedule } = req.body;

  await run(`
    INSERT INTO sms_preferences (user_id, phone, sms_reminders, sms_confirmation, sms_cancellation, sms_reschedule)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id)
    DO UPDATE SET
      phone = COALESCE($2, sms_preferences.phone),
      sms_reminders = COALESCE($3, sms_preferences.sms_reminders),
      sms_confirmation = COALESCE($4, sms_preferences.sms_confirmation),
      sms_cancellation = COALESCE($5, sms_preferences.sms_cancellation),
      sms_reschedule = COALESCE($6, sms_preferences.sms_reschedule),
      updated_at = NOW()
  `, [
    req.user.id,
    phone || null,
    sms_reminders !== undefined ? (sms_reminders ? 1 : 0) : null,
    sms_confirmation !== undefined ? (sms_confirmation ? 1 : 0) : null,
    sms_cancellation !== undefined ? (sms_cancellation ? 1 : 0) : null,
    sms_reschedule !== undefined ? (sms_reschedule ? 1 : 0) : null,
  ]);

  const prefs = await queryOne('SELECT * FROM sms_preferences WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'SMS preferences updated', preferences: prefs });
});

// ─── SMS Log (admin) ─────────────────────────────────

router.get('/log', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return sendError(res, 403, 'Admin access required');
  const log = await queryAll(`
    SELECT sl.*, u.name as user_name, u.email
    FROM sms_log sl
    JOIN users u ON sl.user_id = u.id
    ORDER BY sl.created_at DESC LIMIT 100
  `);
  res.json({ log });
});

module.exports = { router, sendSms };
