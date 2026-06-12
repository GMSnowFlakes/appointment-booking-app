/**
 * Scheduler — periodically checks for upcoming appointments and sends reminder emails.
 *
 * Runs a check every CHECK_INTERVAL minutes for appointments that:
 *  - Are ~24 hours away (within a configurable window)
 *  - Have status 'confirmed'
 *  - Have not already had a reminder sent (reminder_sent = 0)
 */

const { queryAll, run } = require('./db');
const { sendReminderEmail } = require('./email');
const logger = require('./logger');

// ─── Configuration ────────────────────────────

const _parseInt = (v, def) => { const n = parseInt(v); return isNaN(n) ? def : n; };
const _parseFloat = (v, def) => { const n = parseFloat(v); return isNaN(n) ? def : n; };

const CHECK_INTERVAL_MS = _parseInt(process.env.REMINDER_CHECK_INTERVAL, 5) * 60 * 1000;
const REMINDER_HOURS_BEFORE = _parseFloat(process.env.REMINDER_HOURS_BEFORE, 24);
const REMINDER_WINDOW_MINUTES = _parseFloat(process.env.REMINDER_WINDOW_MINUTES, 120);

/**
 * Format a Date to YYYY-MM-DD string.
 */
function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Find all confirmed appointments happening within the reminder window
 * that haven't received a reminder yet.
 */
async function findAppointmentsNeedingReminders() {
  const now = new Date();
  const targetTime = new Date(now.getTime() + REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
  const windowMs = REMINDER_WINDOW_MINUTES * 60 * 1000;

  const windowStart = new Date(targetTime.getTime() - windowMs / 2);
  const windowEnd = new Date(targetTime.getTime() + windowMs / 2);

  const windowStartDate = fmtDate(windowStart);
  const windowEndDate = fmtDate(windowEnd);

  const appointments = await queryAll(`
    SELECT
      a.id,
      a.date,
      a.time,
      a.status,
      a.notes,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.status = 'confirmed'
      AND (a.reminder_sent IS NULL OR a.reminder_sent = 0)
      AND (u.email_reminders IS NULL OR u.email_reminders = 1)
      AND a.date >= $1
      AND a.date <= $2
    ORDER BY a.date, a.time
  `, [windowStartDate, windowEndDate]);

  // Filter by exact time in JS
  return appointments.filter(apt => {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    return aptDateTime >= windowStart && aptDateTime <= windowEnd;
  });
}

/**
 * Send reminder for a single appointment and mark it as sent.
 */
async function processReminder(appointment) {
  try {
    const user = {
      name: appointment.user_name,
      email: appointment.user_email,
    };

    await sendReminderEmail(user, appointment);

    await run("UPDATE appointments SET reminder_sent = 1 WHERE id = $1", [appointment.id]);

    logger.info({
      appointmentId: appointment.id,
      userId: appointment.user_id,
      serviceName: appointment.service_name,
      date: appointment.date,
      time: appointment.time,
    }, 'Reminder email sent');

    return true;
  } catch (err) {
    logger.error({
      err,
      appointmentId: appointment.id,
      userId: appointment.user_id,
    }, 'Failed to send reminder email');

    return false;
  }
}

/**
 * Run one full check cycle: find appointments needing reminders and send them.
 */
async function runReminderCheck() {
  logger.debug('Scheduler: Checking for appointments needing reminders...');

  try {
    const appointments = await findAppointmentsNeedingReminders();

    if (appointments.length === 0) {
      logger.debug('Scheduler: No appointments need reminders');
      return;
    }

    logger.info({ count: appointments.length }, `Scheduler: Found ${appointments.length} appointment(s) needing reminders`);

    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      const success = await processReminder(appointment);
      if (success) sent++;
      else failed++;
    }

    logger.info({ sent, failed }, 'Scheduler: Reminder check complete');
  } catch (err) {
    logger.error({ err }, 'Scheduler: Error during reminder check');
  }
}

// ─── Lifecycle ─────────────────────────────────

let intervalHandle = null;

function startScheduler() {
  if (intervalHandle) {
    logger.warn('Scheduler: Already running, ignoring start request');
    return;
  }

  logger.info({
    checkIntervalMs: CHECK_INTERVAL_MS,
    reminderHoursBefore: REMINDER_HOURS_BEFORE,
    reminderWindowMinutes: REMINDER_WINDOW_MINUTES,
  }, 'Scheduler: Starting reminder email scheduler');

  runReminderCheck();
  intervalHandle = setInterval(runReminderCheck, CHECK_INTERVAL_MS);
}

function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Scheduler: Stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runReminderCheck,
  findAppointmentsNeedingReminders,
};
