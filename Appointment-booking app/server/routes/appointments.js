const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendBookingConfirmation, sendCancellationConfirmation } = require('../email');
const {
  createAppointmentSchema,
  rescheduleSchema,
  appointmentFilterSchema,
  validate,
} = require('../validation');
const { ApiError, sendValidationError, sendNotFoundError, sendConflictError, sendError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// GET /appointments/availability - Get booked slots for a date range (public, no auth required)
router.get('/availability', (req, res) => {
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

  const appointments = queryAll(`
    SELECT 
      a.date,
      a.time,
      a.status,
      s.id as service_id,
      s.name as service_name,
      s.duration as service_duration
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.date >= ? AND a.date <= ? AND a.status != 'cancelled'
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
router.get('/', authenticateToken, (req, res) => {
  const q = validate(appointmentFilterSchema, req.query);
  const filter = q.valid ? q.data : { page: 1, limit: 10 };

  const conditions = ['a.user_id = ?'];
  const params = [req.user.id];

  if (filter.status) {
    const statuses = filter.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      conditions.push('a.status = ?');
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      conditions.push(`a.status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
  }

  if (filter.date_from) {
    conditions.push('a.date >= ?');
    params.push(filter.date_from);
  }

  if (filter.date_to) {
    conditions.push('a.date <= ?');
    params.push(filter.date_to);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = queryOne(
    `SELECT COUNT(*) as total FROM appointments a WHERE ${whereClause}`,
    params
  );
  const total = countResult?.total || 0;

  const offset = (filter.page - 1) * filter.limit;

  const appointments = queryAll(`
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
    LIMIT ? OFFSET ?
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
router.get('/all', authenticateToken, (req, res) => {
  const appointments = queryAll(`
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
router.post('/', authenticateToken, (req, res) => {
  const v = validate(createAppointmentSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { service_id, date, time, notes } = v.data;

  const service = queryOne('SELECT * FROM services WHERE id = ? AND is_active = 1', [service_id]);
  if (!service) {
    return sendNotFoundError(res, 'Service not found or unavailable');
  }

  const bookingDate = new Date(`${date}T${time}`);
  if (bookingDate < new Date()) {
    return sendValidationError(res, 'Cannot book appointments in the past');
  }

  const newEndTime = addMinutes(time, service.duration);
  const conflict = queryOne(`
    SELECT a.id FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.date = ? AND a.status != 'cancelled'
    AND ? < time(a.time, '+' || s.duration || ' minutes')
    AND a.time < ?
  `, [date, time, newEndTime]);

  if (conflict) {
    return sendConflictError(res, 'This time slot is already booked');
  }

  const result = run(`
    INSERT INTO appointments (user_id, service_id, date, time, status, notes)
    VALUES (?, ?, ?, ?, 'confirmed', ?)
  `, [req.user.id, service_id, date, time, notes || null]);

  const appointment = queryOne(`
    SELECT 
      a.id, a.date, a.time, a.status, a.notes, a.created_at,
      s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ?
  `, [result.lastInsertRowid]);

  logger.info({ userId: req.user.id, appointmentId: appointment?.id }, 'Appointment created');

  // Send booking confirmation email (non-blocking)
  const user = queryOne('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
  if (user) {
    sendBookingConfirmation(user, appointment).catch(err =>
      logger.error({ err }, 'Failed to send confirmation email')
    );
  }

  res.status(201).json({ message: 'Appointment booked successfully', appointment });
});

// PUT /appointments/:id/reschedule - Reschedule an appointment
router.put('/:id/reschedule', authenticateToken, (req, res) => {
  const v = validate(rescheduleSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { date, time } = v.data;

  const appointment = queryOne('SELECT a.*, s.duration as service_duration FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.id = ? AND a.user_id = ?',
    [req.params.id, req.user.id]);

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
  const conflict = queryOne(`
    SELECT a.id FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.date = ? AND a.status != 'cancelled' AND a.id != ?
    AND ? < time(a.time, '+' || s.duration || ' minutes')
    AND a.time < ?
  `, [date, req.params.id, time, newEndTime]);

  if (conflict) {
    return sendConflictError(res, 'This time slot is already booked');
  }

  run("UPDATE appointments SET date = ?, time = ?, updated_at = datetime('now') WHERE id = ?",
    [date, time, req.params.id]);

  const updated = queryOne(`
    SELECT 
      a.id, a.date, a.time, a.status, a.notes, a.created_at, a.updated_at,
      s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ?
  `, [req.params.id]);

  logger.info({ userId: req.user.id, appointmentId: req.params.id }, 'Appointment rescheduled');

  res.json({ message: 'Appointment rescheduled successfully', appointment: updated });
});

// PUT /appointments/:id/cancel - Cancel an appointment
router.put('/:id/cancel', authenticateToken, (req, res) => {
  const appointment = queryOne('SELECT * FROM appointments WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]);

  if (!appointment) {
    return sendNotFoundError(res, 'Appointment not found');
  }

  if (appointment.status === 'cancelled') {
    return sendValidationError(res, 'Appointment is already cancelled');
  }

  run("UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [req.params.id]);

  logger.info({ userId: req.user.id, appointmentId: req.params.id }, 'Appointment cancelled');

  // Send cancellation email (non-blocking)
  const user = queryOne('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
  const cancelledApt = queryOne(`
    SELECT a.id, a.date, a.time, a.notes, a.created_at, a.status,
           s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ?
  `, [req.params.id]);
  if (user && cancelledApt) {
    sendCancellationConfirmation(user, cancelledApt).catch(err =>
      logger.error({ err }, 'Failed to send cancellation email')
    );
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
