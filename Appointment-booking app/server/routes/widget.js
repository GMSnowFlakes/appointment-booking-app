/**
 * Embeddable Booking Widget Route
 *
 * GET    /api/widget/:token            Public: widget config for embed
 * GET    /api/widget/:token/services   Public: services for widget
 * GET    /api/widget/:token/staff      Public: staff for widget
 * GET    /api/admin/widgets            Admin: list widgets
 * POST   /api/admin/widgets            Admin: create widget
 * PUT    /api/admin/widgets/:id        Admin: update widget
 * DELETE /api/admin/widgets/:id        Admin: delete widget
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();
const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// ─── Public: Widget config (no auth) ────────────────

router.get('/:token', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) return sendNotFoundError(res, 'Widget not found or inactive');

    // Get the business settings for name/description
    const settings = await queryOne('SELECT business_name, business_description FROM business_settings LIMIT 1');

    res.json({
      widget: {
        name: widget.name,
        primary_color: widget.primary_color,
        button_text: widget.button_text,
        header_text: widget.header_text,
        show_staff: !!widget.show_staff,
        show_services: !!widget.show_services,
        custom_css: widget.custom_css,
      },
      business: {
        name: settings?.business_name || 'My Business',
        description: settings?.business_description || '',
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to load widget');
    sendError(res, 500, 'Failed to load widget');
  }
});

// ─── Public: Widget services ────────────────────────

router.get('/:token/services', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) return sendNotFoundError(res, 'Widget not found');

    let services;
    if (widget.allowed_services && widget.allowed_services.length > 0) {
      services = await queryAll(
        'SELECT id, name, description, duration, price, category FROM services WHERE id = ANY($1) AND is_active = 1 ORDER BY category, name',
        [widget.allowed_services]
      );
    } else {
      services = await queryAll(
        'SELECT id, name, description, duration, price, category FROM services WHERE is_active = 1 ORDER BY category, name'
      );
    }

    res.json({ services });
  } catch (err) {
    logger.error({ err }, 'Failed to load widget services');
    sendError(res, 500, 'Failed to load services');
  }
});

// ─── Public: Widget staff ──────────────────────────

router.get('/:token/staff', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) return sendNotFoundError(res, 'Widget not found');

    let staff;
    if (widget.allowed_staff && widget.allowed_staff.length > 0) {
      staff = await queryAll(
        'SELECT sm.id, sm.name, sm.title, sm.color FROM staff_members sm WHERE sm.id = ANY($1) AND sm.is_active = 1 ORDER BY sm.name',
        [widget.allowed_staff]
      );
    } else {
      staff = await queryAll(
        'SELECT sm.id, sm.name, sm.title, sm.color FROM staff_members sm WHERE sm.is_active = 1 ORDER BY sm.name'
      );
    }

    res.json({ staff });
  } catch (err) {
    logger.error({ err }, 'Failed to load widget staff');
    sendError(res, 500, 'Failed to load staff');
  }
});

// ─── Admin CRUD ─────────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  try {
    const widgets = await queryAll('SELECT * FROM booking_widgets ORDER BY created_at DESC');
    res.json({ widgets });
  } catch (err) {
    logger.error({ err }, 'Failed to list widgets');
    sendError(res, 500, 'Failed to load widgets');
  }
});

adminRouter.post('/', async (req, res) => {
  try {
    const {
      name, primary_color, button_text, header_text,
      show_staff, show_services, allowed_services, allowed_staff, custom_css,
    } = req.body;

    const token = generateToken();
    const result = await run(`
      INSERT INTO booking_widgets (name, widget_token, primary_color, button_text, header_text, show_staff, show_services, allowed_services, allowed_staff, custom_css)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      name || 'Default Widget', token,
      primary_color || '#e11d48', button_text || 'Book Now', header_text || 'Book an Appointment',
      show_staff !== false ? 1 : 0, show_services !== false ? 1 : 0,
      allowed_services || null, allowed_staff || null, custom_css || null,
    ]);

    const widget = await queryOne('SELECT * FROM booking_widgets WHERE id = $1', [result.lastInsertRowid]);
    logger.info({ widgetId: widget?.id, token }, 'Booking widget created');
    res.status(201).json({ message: 'Widget created', widget });
  } catch (err) {
    logger.error({ err }, 'Failed to create widget');
    sendError(res, 500, 'Failed to create widget');
  }
});

adminRouter.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM booking_widgets WHERE id = $1', [req.params.id]);
    if (!existing) return sendNotFoundError(res, 'Widget not found');

    const fields = ['name', 'primary_color', 'button_text', 'header_text', 'show_staff', 'show_services', 'allowed_services', 'allowed_staff', 'custom_css', 'is_active'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const val = f.startsWith('show_') ? (req.body[f] ? 1 : 0) : req.body[f];
        updates.push(`${f} = $${idx}`);
        params.push(val);
        idx++;
      }
    }

    if (updates.length === 0) return sendValidationError(res, 'No fields to update');
    params.push(req.params.id);
    await run(`UPDATE booking_widgets SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);

    const widget = await queryOne('SELECT * FROM booking_widgets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Widget updated', widget });
  } catch (err) {
    logger.error({ err }, 'Failed to update widget');
    sendError(res, 500, 'Failed to update widget');
  }
});

adminRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM booking_widgets WHERE id = $1', [req.params.id]);
    if (!existing) return sendNotFoundError(res, 'Widget not found');
    await run('DELETE FROM booking_widgets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Widget deleted' });
  } catch (err) {
    logger.error({ err }, 'Failed to delete widget');
    sendError(res, 500, 'Failed to delete widget');
  }
});

router.use('/admin', adminRouter);

module.exports = router;
