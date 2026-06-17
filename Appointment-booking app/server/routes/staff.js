/**
 * Staff Management Route
 *
 * GET    /api/staff              Public: list active staff with their services
 * GET    /api/staff/:id          Public: get staff details + availability
 * GET    /api/staff/:id/availability  Public: get availability for a date range
 * POST   /api/admin/staff        Admin: create staff member
 * GET    /api/admin/staff        Admin: list all staff
 * PUT    /api/admin/staff/:id    Admin: update staff member
 * DELETE /api/admin/staff/:id    Admin: deactivate staff
 * POST   /api/admin/staff/:id/availability  Admin: set weekly availability
 * POST   /api/admin/staff/:id/exception     Admin: add date exception
 */

const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendNotFoundError, sendValidationError } = require('../errors');

const router = express.Router();

// ─── Public: List active staff ──────────────────────────

router.get('/', async (req, res) => {
  const staff = await queryAll(`
    SELECT sm.*, u.name, u.email, u.role
    FROM staff_members sm
    JOIN users u ON sm.user_id = u.id
    WHERE sm.is_active = 1
    ORDER BY u.name
  `);

  // Attach services per staff member
  for (const member of staff) {
    member.services = await queryAll(`
      SELECT ss.*, s.name, s.duration, s.price, s.category
      FROM staff_services ss
      JOIN services s ON ss.service_id = s.id
      WHERE ss.staff_id = $1 AND ss.is_active = 1 AND s.is_active = 1
    `, [member.id]);
  }

  res.json({ staff });
});

// ─── Admin: Staff CRUD ─────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const staff = await queryAll(`
    SELECT sm.*, u.name, u.email, u.role
    FROM staff_members sm
    JOIN users u ON sm.user_id = u.id
    ORDER BY u.name
  `);
  res.json({ staff });
});

adminRouter.post('/', async (req, res) => {
  const { user_id, title, bio, phone, color } = req.body;
  if (!user_id) return sendValidationError(res, 'user_id is required');

  // Verify user exists
  const user = await queryOne('SELECT id FROM users WHERE id = $1', [user_id]);
  if (!user) return sendNotFoundError(res, 'User not found');

  // Check if already staff
  const existing = await queryOne('SELECT id FROM staff_members WHERE user_id = $1', [user_id]);
  if (existing) return sendError(res, 409, 'User is already a staff member');

  const result = await run(`
    INSERT INTO staff_members (user_id, title, bio, phone, color)
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `, [user_id, title || null, bio || null, phone || null, color || '#6366f1']);

  const member = await queryOne('SELECT * FROM staff_members WHERE id = $1', [result.lastInsertRowid]);
  logger.info({ staffId: member?.id }, 'Admin created staff member');
  res.status(201).json({ message: 'Staff member created', staff: member });
});

adminRouter.put('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Staff member not found');

  const { title, bio, phone, color, is_active, max_daily_bookings } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (title !== undefined) { updates.push(`title = $${idx}`); params.push(title); idx++; }
  if (bio !== undefined) { updates.push(`bio = $${idx}`); params.push(bio); idx++; }
  if (phone !== undefined) { updates.push(`phone = $${idx}`); params.push(phone); idx++; }
  if (color !== undefined) { updates.push(`color = $${idx}`); params.push(color); idx++; }
  if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active ? 1 : 0); idx++; }
  if (max_daily_bookings !== undefined) { updates.push(`max_daily_bookings = $${idx}`); params.push(max_daily_bookings); idx++; }

  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  updates.push('updated_at = NOW()');
  params.push(req.params.id);
  await run(`UPDATE staff_members SET ${updates.join(', ')} WHERE id = $${idx}`, params);

  const member = await queryOne('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
  res.json({ message: 'Staff member updated', staff: member });
});

adminRouter.delete('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Staff member not found');
  await run('UPDATE staff_members SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Staff member deactivated' });
});

// ─── Admin: Manage Services per Staff ──────────────────

adminRouter.post('/:id/services', async (req, res) => {
  const { service_ids } = req.body; // Array of service IDs
  if (!Array.isArray(service_ids)) return sendValidationError(res, 'service_ids array is required');

  const existing = await queryOne('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Staff member not found');

  // Replace all service links
  await run('DELETE FROM staff_services WHERE staff_id = $1', [req.params.id]);
  for (const sid of service_ids) {
    await run(
      'INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, sid]
    );
  }

  res.json({ message: 'Staff services updated' });
});

// ─── Admin: Get single staff member with availability ──

adminRouter.get('/:id', async (req, res) => {
  const member = await queryOne(`
    SELECT sm.*, u.name, u.email, u.role
    FROM staff_members sm
    JOIN users u ON sm.user_id = u.id
    WHERE sm.id = $1
  `, [req.params.id]);

  if (!member) return sendNotFoundError(res, 'Staff member not found');

  member.availability = await queryAll(
    'SELECT * FROM staff_availability WHERE staff_id = $1 AND is_active = 1 ORDER BY day_of_week, start_time',
    [member.id]
  );

  res.json({ staff: member });
});

// ─── Admin: Set Weekly Availability ─────────────────────

adminRouter.post('/:id/availability', async (req, res) => {
  const { availability } = req.body; // Array of { day_of_week, start_time, end_time }
  if (!Array.isArray(availability)) return sendValidationError(res, 'availability array is required');

  const existing = await queryOne('SELECT * FROM staff_members WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Staff member not found');

  // Replace all availability
  await run('DELETE FROM staff_availability WHERE staff_id = $1', [req.params.id]);
  for (const slot of availability) {
    if (slot.day_of_week === undefined || !slot.start_time || !slot.end_time) continue;
    await run(
      'INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
      [req.params.id, slot.day_of_week, slot.start_time, slot.end_time]
    );
  }

  res.json({ message: 'Availability updated' });
});

// ─── Admin: Add Date Exception ──────────────────────────

adminRouter.post('/:id/exceptions', async (req, res) => {
  const { exception_date, start_time, end_time, reason, is_available } = req.body;
  if (!exception_date) return sendValidationError(res, 'exception_date is required');

  await run(`
    INSERT INTO staff_exceptions (staff_id, exception_date, start_time, end_time, reason, is_available)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (staff_id, exception_date)
    DO UPDATE SET start_time = $3, end_time = $4, reason = $5, is_available = $6
  `, [req.params.id, exception_date, start_time || null, end_time || null, reason || null, is_available ?? 0]);

  res.json({ message: 'Exception saved' });
});

adminRouter.get('/:id/exceptions', async (req, res) => {
  const exceptions = await queryAll(
    'SELECT * FROM staff_exceptions WHERE staff_id = $1 ORDER BY exception_date',
    [req.params.id]
  );
  res.json({ exceptions });
});

// Mount admin routes under /admin (must come before /:id to prevent "admin" matching as an integer id)
router.use('/admin', adminRouter);

// ─── Public: Get single staff ──────────────────────────

router.get('/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return sendNotFoundError(res, 'Staff member not found');
  }
  const member = await queryOne(`
    SELECT sm.*, u.name, u.email, u.role
    FROM staff_members sm
    JOIN users u ON sm.user_id = u.id
    WHERE sm.id = $1 AND sm.is_active = 1
  `, [req.params.id]);

  if (!member) return sendNotFoundError(res, 'Staff member not found');

  member.services = await queryAll(`
    SELECT ss.*, s.name, s.duration, s.price, s.category
    FROM staff_services ss
    JOIN services s ON ss.service_id = s.id
    WHERE ss.staff_id = $1 AND ss.is_active = 1 AND s.is_active = 1
  `, [member.id]);

  member.availability = await queryAll(
    'SELECT * FROM staff_availability WHERE staff_id = $1 AND is_active = 1 ORDER BY day_of_week, start_time',
    [member.id]
  );

  res.json({ staff: member });
});

// ─── Public: Get availability for a date range ─────────

router.get('/:id/availability', async (req, res) => {
  const { date } = req.query;
  if (!date) return sendValidationError(res, 'date query parameter is required (YYYY-MM-DD)');

  const member = await queryOne('SELECT * FROM staff_members WHERE id = $1 AND is_active = 1', [req.params.id]);
  if (!member) return sendNotFoundError(res, 'Staff member not found');

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();

  // Check for date exception
  const exception = await queryOne(
    'SELECT * FROM staff_exceptions WHERE staff_id = $1 AND exception_date = $2',
    [member.id, date]
  );
  if (exception && !exception.is_available) {
    return res.json({ available: false, reason: exception.reason, slots: [] });
  }

  // Get weekly availability
  const weeklySlots = await queryAll(
    'SELECT * FROM staff_availability WHERE staff_id = $1 AND day_of_week = $2 AND is_active = 1 ORDER BY start_time',
    [member.id, dayOfWeek]
  );

  if (weeklySlots.length === 0) {
    return res.json({ available: false, reason: 'Not available this day', slots: [] });
  }

  // If exception exists with custom hours, use those
  let timeSlots = weeklySlots;
  if (exception && exception.is_available && exception.start_time) {
    timeSlots = [{ start_time: exception.start_time, end_time: exception.end_time }];
  }

  // Get existing appointments for this staff on this date
  const bookedTimes = await queryAll(`
    SELECT time, s.duration FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN staff_appointments sa ON sa.appointment_id = a.id
    WHERE sa.staff_id = $1 AND a.date = $2 AND a.status = 'confirmed'
  `, [member.id, date]);

  // Generate available slots (30-min intervals)
  const slots = [];
  for (const slot of timeSlots) {
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current + 30 <= end) {
      const hours = String(Math.floor(current / 60)).padStart(2, '0');
      const mins = String(current % 60).padStart(2, '0');
      const timeStr = `${hours}:${mins}`;

      // Check if slot conflicts with existing booking
      const isBooked = bookedTimes.some(bt => {
        const [btH, btM] = bt.time.split(':').map(Number);
        const btStart = btH * 60 + btM;
        const btEnd = btStart + bt.duration;
        return current < btEnd && current + 30 > btStart;
      });

      slots.push({ time: timeStr, available: !isBooked });
      current += 30;
    }
  }

  res.json({
    available: slots.some(s => s.available),
    staff_id: member.id,
    staff_name: member.name,
    date,
    slots,
  });
});

module.exports = router;
