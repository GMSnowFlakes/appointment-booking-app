const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendBookingConfirmation, sendCancellationConfirmation, sendRescheduleConfirmation, sendAdminBookingNotification, sendAdminCancellationNotification, sendAdminRescheduleNotification } = require('../email');
const {
  createAppointmentSchema,
  rescheduleSchema,
  appointmentFilterSchema,
  validate,
} = require('../validation');
const { ApiError, sendValidationError, sendNotFoundError, sendConflictError, sendError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// GET /appointments/availability - Get booked slots for a date range (public, no auth)
router.get('/availability', async (req, res) => {
  const { start, end, date } = req.query;
  let dateStart = start;
  let dateEnd = end;

  if (date) {
    dateStart = date;
    dateEnd = date;
  }

  if (!dateStart || !dateEnd) {
    return sendValidationError(res, 'Provide date, or start and end query params (YYYY-MM-DD)');
  }

  const appointments = await queryAll(`
    SELECT
      a.date,
      a.time,
      a.status,
      s.id as service_id,
      s.name as service_name,
      s.duration as service_duration
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.date >= $1 AND a.date <= $2 AND a.status != 'cancelled'
    ORDER BY a.date, a.time
  `, [dateStart, dateEnd]);

  // Compute which 30-min slots are occupied for each date
  const occupied = {};

  for (const apt of appointments) {
    if (!occupied[apt.date]) occupied[apt.date] = new Set();
    const [h, m] = apt.time.split(':').map(Number);
    let startMinutes = h * 60 + m;
    const endMinutes = startMinutes + apt.service_duration;

    while (startMinutes < endMinutes) {
      const slotH = Math.floor(startMinutes / 60);
      const slotM = startMinutes % 60;
      if (slotM === 0 || slotM === 30) {
        occupied[apt.date].add(`${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`);
      }
      startMinutes += 30;
    }
  }

  const availability = {};
  for (const [d, slots] of Object.entries(occupied)) {
    availability[d] = Array.from(slots).sort();
  }

  res.json({ availability, appointments });
});

// GET /appointments - Get user's appointments with pagination & date filtering
router.get('/', authenticateToken, async (req, res) => {
  const q = validate(appointmentFilterSchema, req.query);
  const filter = q.valid ? q.data : { page: 1, limit: 10 };

  const conditions = ['a.user_id = $1'];
  const params = [req.user.id];
  let paramIdx = 2;

  if (filter.status) {
    const statuses = filter.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      conditions.push(`a.status = $${paramIdx}`);
      params.push(statuses[0]);
      paramIdx++;
    } else if (statuses.length > 1) {
      const placeholders = statuses.map((_, i) => `$${paramIdx + i}`);
      conditions.push(`a.status IN (${placeholders.join(',')})`);
      params.push(...statuses);
      paramIdx += statuses.length;
    }
  }

  if (filter.date_from) {
    conditions.push(`a.date >= $${paramIdx}`);
    params.push(filter.date_from);
    paramIdx++;
  }

  if (filter.date_to) {
    conditions.push(`a.date <= $${paramIdx}`);
    params.push(filter.date_to);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await queryOne(
    `SELECT COUNT(*)::int as total FROM appointments a WHERE ${whereClause}`,
    params
  );
  const total = countResult?.total || 0;

  const offset = (filter.page - 1) * filter.limit;

  const appointments = await queryAll(`
    SELECT
      a.id,
      a.date,
      a.time,
      a.status,
      a.notes,
      a.created_at,
      s.id as service_id,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE ${whereClause}
    ORDER BY a.date DESC, a.time DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `, [...params, filter.limit, offset]);

  logger.debug({ userId: req.user.id, page: filter.page, count: appointments.length }, 'Appointments listed');

  res.json({
    appointments,
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.ceil(total / filter.limit),
    },
  });
});

// GET /appointments/all - Get ALL appointments (for admin/staff view)
router.get('/all', authenticateToken, async (req, res) => {
  const appointments = await queryAll(`
    SELECT
      a.id,
      a.date,
      a.time,
      a.status,
      a.notes,
      a.created_at,
      u.name as user_name,
      u.email as user_email,
      s.id as service_id,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
    ORDER BY a.date DESC, a.time DESC
  `);

  res.json({ appointments });
});

// POST /appointments - Create a new appointment
router.post('/', authenticateToken, async (req, res) => {
  const v = validate(createAppointmentSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { service_id, date, time, notes } = v.data;

  const service = await queryOne(
    'SELECT * FROM services WHERE id = $1 AND is_active = 1',
    [service_id]
  );
  if (!service) {
    return sendNotFoundError(res, 'Service not found or unavailable');
  }

  const bookingDate = new Date(`${date}T${time}`);
  if (bookingDate < new Date()) {
    return sendValidationError(res, 'Cannot book appointments in the past');
  }

  const newEndTime = addMinutes(time, service.duration);
  const conflict = await queryOne(`
    SELECT a.id FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.date = $1 AND a.status != 'cancelled'
    AND $2::time < (a.time::time + (s.duration || ' minutes')::interval)::time
    AND a.time::time < $3::time
  `, [date, time, newEndTime]);

  if (conflict) {
    return sendConflictError(res, 'This time slot is already booked');
  }

  const result = await run(`
    INSERT INTO appointments (user_id, service_id, date, time, status, notes)
    VALUES ($1, $2, $3, $4, 'confirmed', $5)
    RETURNING id
  `, [req.user.id, service_id, date, time, notes || null]);

  const appointment = await queryOne(`
    SELECT
      a.id, a.date, a.time, a.status, a.notes, a.created_at,
      s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = $1
  `, [result.lastInsertRowid]);

  logger.info({ userId: req.user.id, appointmentId: appointment?.id }, 'Appointment created');

  // Send booking confirmation email (non-blocking)
  const user = await queryOne('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
  if (user) {
    sendBookingConfirmation(user, appointment).catch(err =>
      logger.error({ err }, 'Failed to send confirmation email')
    );
  }

  // Notify all admin users about the new booking (non-blocking)
  const admins = await queryAll(
    `SELECT id, name, email FROM users
     WHERE role = $1 AND (email_reminders IS NULL OR email_reminders = 1)`,
    ['admin']
  );
  if (admins && admins.length > 0) {
    sendAdminBookingNotification(admins, user, appointment).catch(err =>
      logger.error({ err }, 'Failed to send admin booking notification')
    );
  }

  res.status(201).json({ message: 'Appointment booked successfully', appointment });
});

// PUT /appointments/:id/reschedule - Reschedule an appointment
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
  const v = validate(rescheduleSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { date, time } = v.data;

  const appointment = await queryOne(`
    SELECT a.*, s.duration as service_duration
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = $1 AND a.user_id = $2
  `, [req.params.id, req.user.id]);

  if (!appointment) {
    return sendNotFoundError(res, 'Appointment not found');
  }

  if (appointment.status !== 'confirmed') {
    return sendValidationError(res, 'Can only reschedule confirmed appointments');
  }

  const newDate = new Date(`${date}T${time}`);
  if (newDate < new Date()) {
    return sendValidationError(res, 'Cannot reschedule to a past date or time');
  }

  const newEndTime = addMinutes(time, appointment.service_duration);
  const conflict = await queryOne(`
    SELECT a.id FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.date = $1 AND a.status != 'cancelled' AND a.id != $2
    AND $3::time < (a.time::time + (s.duration || ' minutes')::interval)::time
    AND a.time::time < $4::time
  `, [date, req.params.id, time, newEndTime]);

  if (conflict) {
    return sendConflictError(res, 'This time slot is already booked');
  }

  await run(
    `UPDATE appointments SET date = $1, time = $2, updated_at = NOW() WHERE id = $3`,
    [date, time, req.params.id]
  );

  const updated = await queryOne(`
    SELECT
      a.id, a.date, a.time, a.status, a.notes, a.created_at, a.updated_at,
      s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = $1
  `, [req.params.id]);

  logger.info({ userId: req.user.id, appointmentId: req.params.id }, 'Appointment rescheduled');

  // Send reschedule confirmation email (non-blocking, respects user preferences)
  const user = await queryOne(
    'SELECT name, email, email_reminders FROM users WHERE id = $1',
    [req.user.id]
  );
  if (user && (user.email_reminders === 1 || user.email_reminders === null)) {
    sendRescheduleConfirmation(user, appointment, updated).catch(err =>
      logger.error({ err }, 'Failed to send reschedule confirmation email')
    );
  }

  // Notify all admin users about the reschedule (non-blocking)
  const admins = await queryAll(
    `SELECT id, name, email FROM users
     WHERE role = $1 AND (email_reminders IS NULL OR email_reminders = 1)`,
    ['admin']
  );
  if (admins && admins.length > 0 && user) {
    sendAdminRescheduleNotification(admins, user, appointment, updated).catch(err =>
      logger.error({ err }, 'Failed to send admin reschedule notification')
    );
  }

  res.json({ message: 'Appointment rescheduled successfully', appointment: updated });
});

// PUT /appointments/:id/cancel - Cancel an appointment
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const appointment = await queryOne(
    'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );

  if (!appointment) {
    return sendNotFoundError(res, 'Appointment not found');
  }

  if (appointment.status === 'cancelled') {
    return sendValidationError(res, 'Appointment is already cancelled');
  }

  await run(
    `UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [req.params.id]
  );

  logger.info({ userId: req.user.id, appointmentId: req.params.id }, 'Appointment cancelled');

  // Send cancellation email (non-blocking)
  const user = await queryOne('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
  const cancelledApt = await queryOne(`
    SELECT a.id, a.date, a.time, a.notes, a.created_at, a.status,
           s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = $1
  `, [req.params.id]);

  if (user && cancelledApt) {
    sendCancellationConfirmation(user, cancelledApt).catch(err =>
      logger.error({ err }, 'Failed to send cancellation email')
    );

    // Notify all admin users about the cancellation (non-blocking)
    const admins = await queryAll(
      `SELECT id, name, email FROM users
       WHERE role = $1 AND (email_reminders IS NULL OR email_reminders = 1)`,
      ['admin']
    );
    if (admins && admins.length > 0) {
      sendAdminCancellationNotification(admins, user, cancelledApt).catch(err =>
        logger.error({ err }, 'Failed to send admin cancellation notification')
      );
    }
  }

  res.json({ message: 'Appointment cancelled successfully' });
});

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

module.exports = router;
