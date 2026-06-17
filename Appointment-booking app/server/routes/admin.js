const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
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
const { sendStatusChangeConfirmation } = require('../email');
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

router.get('/services', async (req, res) => {
  const services = await queryAll('SELECT * FROM services ORDER BY category, name');
  res.json({ services });
});

router.post('/services', upload.single('image'), async (req, res) => {
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
  const result = await run(
    `INSERT INTO services (name, description, duration, price, category, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, description || null, duration, price, category || null, image_url || null]
  );

  const service = await queryOne('SELECT * FROM services WHERE id = $1', [result.lastInsertRowid]);

  logger.info({ serviceId: service?.id, name }, 'Admin created service');
  res.status(201).json({ message: 'Service created successfully', service });
});

router.put('/services/:id', upload.single('image'), async (req, res) => {
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

  const existing = await queryOne('SELECT * FROM services WHERE id = $1', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Service not found');
  }

  const updates = [];
  const params = [];
  let paramIdx = 1;
  const data = v.data;

  if (data.name !== undefined) { updates.push(`name = $${paramIdx}`); params.push(data.name); paramIdx++; }
  if (data.description !== undefined) { updates.push(`description = $${paramIdx}`); params.push(data.description); paramIdx++; }
  if (data.duration !== undefined) { updates.push(`duration = $${paramIdx}`); params.push(data.duration); paramIdx++; }
  if (data.price !== undefined) { updates.push(`price = $${paramIdx}`); params.push(data.price); paramIdx++; }
  if (data.category !== undefined) { updates.push(`category = $${paramIdx}`); params.push(data.category); paramIdx++; }
  if (data.is_active !== undefined) { updates.push(`is_active = $${paramIdx}`); params.push(data.is_active ? 1 : 0); paramIdx++; }
  if (data.image_url !== undefined) { updates.push(`image_url = $${paramIdx}`); params.push(data.image_url); paramIdx++; }

  if (updates.length === 0) {
    return sendValidationError(res, 'No fields to update');
  }

  params.push(req.params.id);
  await run(
    `UPDATE services SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
    params
  );

  const service = await queryOne('SELECT * FROM services WHERE id = $1', [req.params.id]);

  logger.info({ serviceId: req.params.id }, 'Admin updated service');
  res.json({ message: 'Service updated successfully', service });
});

router.delete('/services/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM services WHERE id = $1', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Service not found');
  }

  await run("UPDATE services SET is_active = 0 WHERE id = $1", [req.params.id]);

  logger.info({ serviceId: req.params.id }, 'Admin deactivated service');
  res.json({ message: 'Service deactivated successfully' });
});

router.post('/services/:id/restore', async (req, res) => {
  const existing = await queryOne('SELECT * FROM services WHERE id = $1', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Service not found');
  }

  await run("UPDATE services SET is_active = 1 WHERE id = $1", [req.params.id]);

  logger.info({ serviceId: req.params.id }, 'Admin restored service');
  res.json({ message: 'Service reactivated successfully' });
});

// ──────────────────────────────────────────────
// APPOINTMENTS MANAGEMENT
// ──────────────────────────────────────────────

router.get('/appointments', async (req, res) => {
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
  let paramIdx = 1;

  if (status) {
    conditions.push(`a.status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }
  if (date) {
    conditions.push(`a.date = $${paramIdx}`);
    params.push(date);
    paramIdx++;
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY a.date DESC, a.time DESC';

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 50, 100);
  const offset = (pageNum - 1) * limitNum;

  const countResult = await queryOne(
    `SELECT COUNT(*)::int as total FROM appointments a${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`,
    params
  );
  const total = countResult?.total || 0;

  sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  const appointments = await queryAll(sql, [...params, limitNum, offset]);

  res.json({
    appointments,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

router.put('/appointments/:id/status', async (req, res) => {
  const v = validate(statusUpdateSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { status } = v.data;
  const existing = await queryOne('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'Appointment not found');
  }

  await run(
    `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, req.params.id]
  );

  const appointment = await queryOne(`
    SELECT a.*, u.name as user_name, u.email as user_email,
           s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.id = $1
  `, [req.params.id]);

  logger.info({ appointmentId: req.params.id, status }, 'Admin updated appointment status');

  // Send status change notification to the appointment owner (non-blocking, respects preferences)
  if (appointment && appointment.user_email) {
    const user = {
      name: appointment.user_name,
      email: appointment.user_email,
    };

    const ownerPref = await queryOne(
      'SELECT email_reminders FROM users WHERE id = $1',
      [appointment.user_id]
    );
    if (ownerPref && (ownerPref.email_reminders === 1 || ownerPref.email_reminders === null)) {
      sendStatusChangeConfirmation(user, appointment).catch(err =>
        logger.error({ err, appointmentId: req.params.id }, 'Failed to send status change email')
      );
    }
  }

  res.json({ message: `Appointment status updated to '${status}'`, appointment });
});

// ──────────────────────────────────────────────
// USER MANAGEMENT
// ──────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const { role } = req.query;
  let users;
  if (process.env.MOCK_DB) {
    let sql = `SELECT id, name, email, role, created_at FROM users`;
    const params = [];
    if (role) { sql += ` WHERE role = $1`; params.push(role); }
    sql += ` ORDER BY created_at DESC`;
    users = await queryAll(sql, params.length ? params : undefined);
    for (const user of users) {
      const countResult = await queryOne("SELECT COUNT(*) as cnt FROM appointments WHERE user_id = $1", [user.id]);
      user.appointment_count = countResult ? parseInt(countResult.cnt) : 0;
    }
  } else {
    let sql = `SELECT u.id, u.name, u.email, u.role, u.created_at,
      (SELECT COUNT(*)::int FROM appointments WHERE user_id = u.id) as appointment_count
    FROM users u`;
    const params = [];
    if (role) { sql += ` WHERE u.role = $1`; params.push(role); }
    sql += ` ORDER BY u.created_at DESC`;
    users = await queryAll(sql, params.length ? params : undefined);
  }
  res.json({ users });
});

router.post('/users', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, role } = req.body;
  if (!name || !email) return sendValidationError(res, 'name and email are required');
  if (role && !['customer', 'admin', 'staff'].includes(role)) return sendValidationError(res, 'Role must be one of: customer, admin, staff');

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return sendError(res, 409, 'Email already registered');

  const defaultRole = role || 'customer';
  const genPass = Math.random().toString(36).slice(2, 10) + 'A1!';
  const hashedPassword = bcrypt.hashSync(genPass, 10);

  const result = await run(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, hashedPassword, defaultRole]
  );

  const user = await queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [result.lastInsertRowid]);
  logger.info({ userId: user?.id, email, role: defaultRole }, 'Admin created user');
  res.status(201).json({ message: 'User created successfully', user });
});

router.put('/users/:id/role', async (req, res) => {
  const v = validate(roleUpdateSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { role } = v.data;
  const existing = await queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'User not found');
  }

  if (req.user.id === parseInt(req.params.id) && role !== 'admin') {
    return sendValidationError(res, 'Cannot remove your own admin role');
  }

  await run('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);

  const user = await queryOne(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.params.id]
  );

  logger.info({ userId: req.params.id, role }, 'Admin updated user role');
  res.json({ message: `User role updated to '${role}'`, user });
});

router.delete('/users/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!existing) {
    return sendNotFoundError(res, 'User not found');
  }

  if (req.user.id === parseInt(req.params.id)) {
    return sendValidationError(res, 'Cannot delete your own account');
  }

  await run('DELETE FROM appointments WHERE user_id = $1', [req.params.id]);
  await run('DELETE FROM users WHERE id = $1', [req.params.id]);

  logger.info({ userId: req.params.id }, 'Admin deleted user');
  res.json({ message: 'User and their appointments deleted successfully' });
});

// ──────────────────────────────────────────────
// BUSINESS SETTINGS
// ──────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  let settings = await queryOne('SELECT * FROM business_settings LIMIT 1');
  if (!settings) {
    await run(
      `INSERT INTO business_settings (business_name, business_type)
       VALUES ($1, $2)`,
      ['My Business', 'salon']
    );
    settings = await queryOne('SELECT * FROM business_settings LIMIT 1');
  }
  if (typeof settings.category_colors === 'string') {
    try { settings.category_colors = JSON.parse(settings.category_colors); } catch { settings.category_colors = {}; }
  }
  res.json({ settings });
});

router.put('/settings', async (req, res) => {
  const v = validate(businessSettingsSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { business_name, business_type, business_description, primary_color, category_colors } = v.data;

  const existing = await queryOne('SELECT id FROM business_settings LIMIT 1');
  if (!existing) {
    await run(
      `INSERT INTO business_settings (business_name, business_type, business_description, primary_color, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [business_name, business_type, business_description || '', primary_color || '#e11d48']
    );
  } else {
    const updates = [];
    const params = [];
    let paramIdx = 1;
    if (business_name !== undefined) { updates.push(`business_name = $${paramIdx}`); params.push(business_name); paramIdx++; }
    if (business_type !== undefined) { updates.push(`business_type = $${paramIdx}`); params.push(business_type); paramIdx++; }
    if (business_description !== undefined) { updates.push(`business_description = $${paramIdx}`); params.push(business_description); paramIdx++; }
    if (primary_color !== undefined) { updates.push(`primary_color = $${paramIdx}`); params.push(primary_color); paramIdx++; }
    if (category_colors !== undefined) { updates.push(`category_colors = $${paramIdx}`); params.push(JSON.stringify(category_colors)); paramIdx++; }
    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      params.push(existing.id);
      await run(
        `UPDATE business_settings SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
        params
      );
    }
  }

  const settings = await queryOne('SELECT * FROM business_settings LIMIT 1');
  logger.info({ businessName: settings?.business_name, businessType: settings?.business_type }, 'Business settings updated');
  res.json({ message: 'Business settings updated successfully', settings });
});

// ──────────────────────────────────────────────
// BUSINESS TYPE TEMPLATES
// ──────────────────────────────────────────────

const { TEMPLATES, getTemplate, getTemplateTypes } = require('../business-templates');

/** Return all template metadata (no service details, just counts) */
router.get('/templates', async (req, res) => {
  const list = [];

  // Built-in templates
  getTemplateTypes().forEach(id => {
    const tpl = TEMPLATES[id];
    list.push({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      roleCount: tpl.roles.length,
      serviceCount: tpl.services.length,
      custom: false,
    });
  });

  // Custom templates from DB
  const custom = await getCustomTemplates();
  Object.keys(custom).forEach(id => {
    const t = custom[id];
    if (!TEMPLATES[id]) {  // don't duplicate built-in
      list.push({
        id,
        name: t.label || id,
        roleCount: (t.roles || []).length,
        serviceCount: (t.services || []).length,
        custom: true,
      });
    }
  });

  list.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ templates: list });
});

/** Return full template for a business type (checks custom first, then built-in) */
router.get('/templates/:type', async (req, res) => {
  // Check custom templates first
  const custom = await getCustomTemplates();
  if (custom[req.params.type]) {
    return res.json({ template: custom[req.params.type], custom: true });
  }
  const tpl = getTemplate(req.params.type);
  if (!tpl) return sendNotFoundError(res, 'No template found for this business type');
  res.json({ template: tpl, custom: false });
});

/** Return disabled template IDs from business_settings */
router.get('/templates/disabled', async (req, res) => {
  const settings = await queryOne('SELECT disabled_templates FROM business_settings LIMIT 1');
  let disabled = [];
  if (settings && settings.disabled_templates) {
    try { disabled = JSON.parse(settings.disabled_templates); } catch { disabled = []; }
  }
  res.json({ disabled });
});

/** Toggle a template as disabled/enabled */
router.post('/templates/toggle', async (req, res) => {
  const { template_id, disabled } = req.body;
  if (!template_id) return sendValidationError(res, 'template_id is required');

  const settings = await queryOne('SELECT id, disabled_templates FROM business_settings LIMIT 1');
  if (!settings) return sendNotFoundError(res, 'Business settings not found');

  let disabledList = [];
  if (settings.disabled_templates) {
    try { disabledList = JSON.parse(settings.disabled_templates); } catch { disabledList = []; }
  }

  if (disabled) {
    if (!disabledList.includes(template_id)) disabledList.push(template_id);
  } else {
    disabledList = disabledList.filter(id => id !== template_id);
  }

  await run('UPDATE business_settings SET disabled_templates = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(disabledList), settings.id]);
  res.json({ disabled: disabledList });
});

/**
 * Import a template for a business type.
 * Inserts services (skipping duplicates by name) and returns what was added.
 */
router.post('/templates/import', async (req, res) => {
  const { business_type, import_roles, import_services } = req.body;
  if (!business_type) return sendValidationError(res, 'business_type is required');

  const tpl = getTemplate(business_type);
  if (!tpl) return sendNotFoundError(res, 'No template found for this business type');

  const created = { services: [], roles: [] };

  // ── Import services (skip duplicates by name) ─────────
  if (import_services !== false) {
    for (const svc of tpl.services) {
      // Check if service with same name already exists (case-insensitive)
      const existing = await queryOne(
        'SELECT id FROM services WHERE LOWER(name) = LOWER($1)',
        [svc.name]
      );
      if (existing) continue; // skip duplicate

      const result = await run(
        `INSERT INTO services (name, description, duration, price, category)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [svc.name, svc.description || null, svc.duration, svc.price, svc.category || null]
      );
      created.services.push({ id: result.lastInsertRowid, ...svc });
    }
  }

  // ── Import roles as staff member templates ────────────
  // Roles become titles in staff_members (actual staff members are created later)
  // We store recommended roles in business_settings as JSON so we can show them
  if (import_roles !== false) {
    // Fetch the current business settings
    const settings = await queryOne('SELECT * FROM business_settings LIMIT 1');
    let recommendedRoles = [];
    if (settings && settings.recommended_roles) {
      try { recommendedRoles = JSON.parse(settings.recommended_roles); } catch { recommendedRoles = []; }
    }

    // Merge new roles
    const existingTitles = new Set(recommendedRoles.map(r => r.title?.toLowerCase()));
    for (const role of tpl.roles) {
      if (!existingTitles.has(role.title.toLowerCase())) {
        recommendedRoles.push(role);
        created.roles.push(role);
      }
    }

    // Save back to business_settings
    const hasExisting = await queryOne('SELECT id FROM business_settings LIMIT 1');
    if (hasExisting) {
      await run(
        'UPDATE business_settings SET recommended_roles = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(recommendedRoles), hasExisting.id]
      );
    }
  }

  logger.info({ businessType: business_type, servicesCreated: created.services.length, rolesCreated: created.roles.length }, 'Template imported');
  res.status(201).json({
    message: `Imported ${created.services.length} services and ${created.roles.length} role templates`,
    created,
  });
});

// ──────────────────────────────────────────────
// TEMPLATE EDITOR (custom templates)
// ──────────────────────────────────────────────

/** Helper: load custom templates from business_settings */
async function getCustomTemplates() {
  const settings = await queryOne('SELECT custom_templates FROM business_settings LIMIT 1');
  if (settings && settings.custom_templates) {
    try { return JSON.parse(settings.custom_templates); } catch { return {}; }
  }
  return {};
}

/** Helper: save custom templates */
async function saveCustomTemplates(custom) {
  const existing = await queryOne('SELECT id FROM business_settings LIMIT 1');
  if (!existing) return;
  await run(
    'UPDATE business_settings SET custom_templates = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(custom), existing.id]
  );
}

/** Create a new custom template for any business type */
router.post('/templates/create', async (req, res) => {
  const { type_id, type_label, type_icon, roles, services } = req.body;
  if (!type_id || !type_label) return sendValidationError(res, 'type_id and type_label are required');

  // Reject IDs that conflict with built-in templates
  if (TEMPLATES[type_id]) return sendValidationError(res, `Cannot create custom template with ID "${type_id}" — this is a built-in template type`);

  const custom = await getCustomTemplates();
  custom[type_id] = {
    label: type_label,
    icon: type_icon || '📋',
    desc: req.body.desc || '',
    roles: roles || [],
    services: services || [],
  };
  await saveCustomTemplates(custom);

  logger.info({ typeId: type_id }, 'Admin created custom template');
  res.status(201).json({ message: 'Template created successfully', type_id });
});

/** Update a custom template */
router.put('/templates/:type', async (req, res) => {
  const custom = await getCustomTemplates();
  if (!custom[req.params.type]) return sendNotFoundError(res, 'Custom template not found');

  const { roles, services, label, icon, desc } = req.body;
  if (label !== undefined) custom[req.params.type].label = label;
  if (icon !== undefined) custom[req.params.type].icon = icon;
  if (desc !== undefined) custom[req.params.type].desc = desc;
  if (roles !== undefined) custom[req.params.type].roles = roles;
  if (services !== undefined) custom[req.params.type].services = services;

  await saveCustomTemplates(custom);
  logger.info({ typeId: req.params.type }, 'Admin updated custom template');
  res.json({ message: 'Template updated successfully' });
});

/** Delete a custom template */
router.delete('/templates/:type', async (req, res) => {
  const custom = await getCustomTemplates();
  if (!custom[req.params.type]) return sendNotFoundError(res, 'Custom template not found');
  delete custom[req.params.type];
  await saveCustomTemplates(custom);
  res.json({ message: 'Template deleted' });
});

module.exports = router;
