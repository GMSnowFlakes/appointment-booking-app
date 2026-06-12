const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  createServiceSchema,
  updateServiceSchema,
  statusUpdateSchema,
  roleUpdateSchema,
  businessSettingsSchema,
  validate,
} = require('../validation');
const { ApiError, sendValidationError, sendNotFoundError, sendError } = require('../errors');
const logger = require('../logger');

// Multer config: store uploaded images to uploads/ with unique filenames
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp, svg) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

// ──────────────────────────────────────────────
// SERVICES CRUD
// ──────────────────────────────────────────────

router.get('/services', (req, res) => {
  const services = queryAll('SELECT * FROM services ORDER BY category, name');
  res.json({ services });
});

router.post('/services', upload.single('image'), (req, res) => {
  // Handle multipart form data (fields arrive as strings)
  let body = req.body;
  if (req.file) {
    body = {
      ...body,
      image_url: '/uploads/' + req.file.filename,
      duration: body.duration ? parseInt(body.duration) : undefined,
      price: body.price ? parseFloat(body.price) : undefined,
    };
  }

  const v = validate(createServiceSchema, body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { name, description, duration, price, category, image_url } = v.data;
  const result = run(
    'INSERT INTO services (name, description, duration, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || null, duration, price, category || null, image_url || null]
  );

  const service = queryOne('SELECT * FROM services WHERE id = ?', [result.lastInsertRowid]);

  logger.info({ serviceId: service?.id, name }, 'Admin created service');
  res.status(201).json({ message: 'Service created successfully', service });
});

router.put('/services/:id', upload.single('image'), (req, res) => {
  // Handle multipart form data
  let body = req.body;
  if (req.file) {
    body = {
      ...body,
      image_url: '/uploads/' + req.file.filename,
      duration: body.duration ? parseInt(body.duration) : undefined,
      price: body.price ? parseFloat(body.price) : undefined,
    };
  }

  const v = validate(updateServiceSchema, body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const existing = queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Service not found');
  }

  const updates = [];
  const params = [];
  const data = v.data;

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.duration !== undefined) { updates.push('duration = ?'); params.push(data.duration); }
  if (data.price !== undefined) { updates.push('price = ?'); params.push(data.price); }
  if (data.category !== undefined) { updates.push('category = ?'); params.push(data.category); }
  if (data.is_active !== undefined) { updates.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
  if (data.image_url !== undefined) { updates.push('image_url = ?'); params.push(data.image_url); }

  if (updates.length === 0) {
    return sendValidationError(res, 'No fields to update');
  }

  params.push(req.params.id);
  run(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params);

  const service = queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);

  logger.info({ serviceId: req.params.id }, 'Admin updated service');
  res.json({ message: 'Service updated successfully', service });
});

router.delete('/services/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Service not found');
  }

  run("UPDATE services SET is_active = 0 WHERE id = ?", [req.params.id]);

  logger.info({ serviceId: req.params.id }, 'Admin deactivated service');
  res.json({ message: 'Service deactivated successfully' });
});

router.post('/services/:id/restore', (req, res) => {
  const existing = queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Service not found');
  }

  run("UPDATE services SET is_active = 1 WHERE id = ?", [req.params.id]);

  logger.info({ serviceId: req.params.id }, 'Admin restored service');
  res.json({ message: 'Service reactivated successfully' });
});

// ──────────────────────────────────────────────
// APPOINTMENTS MANAGEMENT
// ──────────────────────────────────────────────

router.get('/appointments', (req, res) => {
  const { status, date, page, limit } = req.query;

  let sql = `
    SELECT 
      a.id, a.date, a.time, a.status, a.notes, a.created_at, a.updated_at,
      u.id as user_id, u.name as user_name, u.email as user_email,
      s.id as service_id, s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
  `;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (date) {
    conditions.push('a.date = ?');
    params.push(date);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY a.date DESC, a.time DESC';

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 50, 100);
  const offset = (pageNum - 1) * limitNum;

  const countResult = queryOne(
    `SELECT COUNT(*) as total FROM appointments a ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`,
    params
  );
  const total = countResult?.total || 0;

  sql += ' LIMIT ? OFFSET ?';
  const appointments = queryAll(sql, [...params, limitNum, offset]);

  res.json({
    appointments,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

router.put('/appointments/:id/status', (req, res) => {
  const v = validate(statusUpdateSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { status } = v.data;
  const existing = queryOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Appointment not found');
  }

  run("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, req.params.id]);

  const appointment = queryOne(`
    SELECT a.*, u.name as user_name, u.email as user_email,
           s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ?
  `, [req.params.id]);

  logger.info({ appointmentId: req.params.id, status }, 'Admin updated appointment status');
  res.json({ message: `Appointment status updated to '${status}'`, appointment });
});

// ──────────────────────────────────────────────
// USER MANAGEMENT
// ──────────────────────────────────────────────

router.get('/users', (req, res) => {
  const users = queryAll(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           (SELECT COUNT(*) FROM appointments WHERE user_id = u.id) as appointment_count
    FROM users u
    ORDER BY u.created_at DESC
  `);

  res.json({ users });
});

router.put('/users/:id/role', (req, res) => {
  const v = validate(roleUpdateSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { role } = v.data;
  const existing = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'User not found');
  }

  if (req.user.id === parseInt(req.params.id) && role !== 'admin') {
    return sendValidationError(res, 'Cannot remove your own admin role');
  }

  run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

  const user = queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.params.id]);

  logger.info({ userId: req.params.id, role }, 'Admin updated user role');
  res.json({ message: `User role updated to '${role}'`, user });
});

router.delete('/users/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'User not found');
  }

  if (req.user.id === parseInt(req.params.id)) {
    return sendValidationError(res, 'Cannot delete your own account');
  }

  run('DELETE FROM appointments WHERE user_id = ?', [req.params.id]);
  run('DELETE FROM users WHERE id = ?', [req.params.id]);

  logger.info({ userId: req.params.id }, 'Admin deleted user');
  res.json({ message: 'User and their appointments deleted successfully' });
});

// ──────────────────────────────────────────────
// BUSINESS SETTINGS
// ──────────────────────────────────────────────

// GET /api/admin/settings — Get business settings
router.get('/settings', (req, res) => {
  let settings = queryOne('SELECT * FROM business_settings LIMIT 1');
  if (!settings) {
    // Create default settings if none exist
    run('INSERT INTO business_settings (business_name, business_type) VALUES (?, ?)',
      ['My Business', 'salon']);
    settings = queryOne('SELECT * FROM business_settings LIMIT 1');
  }
  // Parse JSON fields
  if (typeof settings.category_colors === 'string') {
    try { settings.category_colors = JSON.parse(settings.category_colors); } catch { settings.category_colors = {}; }
  }
  res.json({ settings });
});

// PUT /api/admin/settings — Update business settings
router.put('/settings', (req, res) => {
  const v = validate(businessSettingsSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { business_name, business_type, business_description, primary_color, category_colors } = v.data;

  const existing = queryOne('SELECT id FROM business_settings LIMIT 1');
  if (!existing) {
    run(`INSERT INTO business_settings (business_name, business_type, business_description, primary_color, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [business_name, business_type, business_description || '', primary_color || '#e11d48']);
  } else {
    const updates = [];
    const params = [];
    if (business_name !== undefined) { updates.push('business_name = ?'); params.push(business_name); }
    if (business_type !== undefined) { updates.push('business_type = ?'); params.push(business_type); }
    if (business_description !== undefined) { updates.push('business_description = ?'); params.push(business_description); }
    if (primary_color !== undefined) { updates.push('primary_color = ?'); params.push(primary_color); }
    if (category_colors !== undefined) { updates.push('category_colors = ?'); params.push(JSON.stringify(category_colors)); }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      run(`UPDATE business_settings SET ${updates.join(', ')} WHERE id = ?`, [...params, existing.id]);
    }
  }

  const settings = queryOne('SELECT * FROM business_settings LIMIT 1');
  logger.info({ businessName: settings?.business_name, businessType: settings?.business_type }, 'Business settings updated');
  res.json({ message: 'Business settings updated successfully', settings });
});

module.exports = router;
