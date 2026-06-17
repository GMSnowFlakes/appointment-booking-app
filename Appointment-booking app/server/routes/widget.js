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
const bcrypt = require('bcryptjs');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// ─── Admin CRUD must come before public /:token routes ─
// to prevent ":token" from swallowing "admin" as a parameter

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
      INSERT INTO booking_widgets (name, widget_token, primary_color, button_text, header_text, show_staff, show_services, allowed_services, allowed_staff, custom_css, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
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

// ─── Public: Widget embed script ─────────────────────

router.get('/:token/embed.js', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) {
      res.status(404).type('text').send('console.error("Booking widget not found or inactive");');
      return;
    }

    const settings = await queryOne('SELECT business_name, business_description, primary_color FROM business_settings LIMIT 1');
    const primaryColor = widget.primary_color || settings?.primary_color || '#e11d48';
    const businessName = settings?.business_name || 'My Business';
    const buttonText = widget.button_text || 'Book Now';
    const headerText = widget.header_text || 'Book an Appointment';
    const showStaff = !!widget.show_staff;
    const showServices = !!widget.show_services;
    const apiBase = `${req.protocol}://${req.get('host')}/api/widget/${req.params.token}`;

    const script = `(function() {
  var container = document.currentScript && document.currentScript.parentElement;
  if (!container) {
    var scripts = document.getElementsByTagName('script');
    container = scripts[scripts.length - 1].parentElement;
  }

  // Create button
  var btn = document.createElement('button');
  btn.textContent = '${buttonText.replace(/'/g, "\\'")}';
  btn.style.cssText = 'padding:14px 28px;border:none;border-radius:12px;font-size:16px;font-weight:600;color:#fff;cursor:pointer;transition:opacity 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.15);background:${primaryColor};';
  btn.onmouseover = function() { this.style.opacity = '0.9'; };
  btn.onmouseout = function() { this.style.opacity = '1'; };
  container.appendChild(btn);

  // Create modal overlay
  var overlay = document.createElement('div');
  overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999998;backdrop-filter:blur(4px);';
  document.body.appendChild(overlay);

  // Create iframe modal
  var modal = document.createElement('div');
  modal.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:480px;max-width:95vw;max-height:90vh;z-index:999999;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);background:#fff;';

  var iframe = document.createElement('iframe');
  iframe.src = '${apiBase}/page';
  iframe.style.cssText = 'width:100%;height:700px;border:none;display:block;';
  iframe.title = '${headerText.replace(/'/g, "\\'")}';
  modal.appendChild(iframe);
  document.body.appendChild(modal);

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:32px;height:32px;border:none;border-radius:50%;background:rgba(0,0,0,0.06);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;color:#666;transition:background 0.15s;';
  closeBtn.onmouseover = function() { this.style.background = 'rgba(0,0,0,0.12)'; };
  closeBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.06)'; };
  modal.appendChild(closeBtn);

  function openModal() {
    overlay.style.display = 'block';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.style.display = 'none';
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  btn.onclick = openModal;
  closeBtn.onclick = closeModal;
  overlay.onclick = closeModal;

  // Handle Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // Handle postMessage for height resizing
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'resize') {
      iframe.style.height = e.data.height + 'px';
    }
  });
})();`;

    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60');
    res.send(script);
  } catch (err) {
    logger.error({ err }, 'Failed to generate widget embed script');
    res.status(500).type('text').send('console.error("Failed to load booking widget");');
  }
});

// ─── Public: Widget booking page (rendered inside iframe) ─

router.get('/:token/page', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) return sendNotFoundError(res, 'Widget not found or inactive');

    const settings = await queryOne('SELECT business_name, business_description, primary_color, logo_url FROM business_settings LIMIT 1');
    const primaryColor = widget.primary_color || settings?.primary_color || '#e11d48';
    const businessName = settings?.business_name || 'My Business';
    const showStaff = !!widget.show_staff;
    const showServices = !!widget.show_services;

    const apiBase = `${req.protocol}://${req.get('host')}/api/widget/${req.params.token}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${widget.header_text || 'Book an Appointment'} — ${businessName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff;
      color: #1a1a2e;
      padding: 20px;
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6c757d; margin-bottom: 20px; }
    .service-grid { display: grid; gap: 8px; }
    .service-btn {
      display: block; width: 100%; padding: 14px 16px;
      border: 2px solid #e9ecef; border-radius: 12px;
      background: #fff; cursor: pointer; text-align: left;
      font-size: 14px; transition: all 0.15s ease;
    }
    .service-btn:hover { border-color: ${primaryColor}40; background: ${primaryColor}08; }
    .service-btn.selected { border-color: ${primaryColor}; background: ${primaryColor}12; }
    .service-btn .name { font-weight: 600; }
    .service-btn .meta { display: flex; gap: 12px; margin-top: 4px; font-size: 13px; color: #6c757d; }
    .service-btn .price { font-weight: 600; }
    .staff-btn {
      display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px;
      border: 2px solid #e9ecef; border-radius: 12px;
      background: #fff; cursor: pointer; text-align: left;
      font-size: 14px; transition: all 0.15s ease;
    }
    .staff-btn:hover { border-color: ${primaryColor}40; background: ${primaryColor}08; }
    .staff-btn.selected { border-color: ${primaryColor}; background: ${primaryColor}12; }
    .staff-btn .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #fff; flex-shrink: 0; }
    .staff-btn .info { flex: 1; }
    .staff-btn .info .name { font-weight: 600; }
    .staff-btn .info .title { font-size: 12px; color: #6c757d; }
    .skip-btn { display: block; width: 100%; padding: 10px; border: 2px dashed #e9ecef; border-radius: 10px; background: #fff; cursor: pointer; font-size: 13px; color: #6c757d; text-align: center; margin-bottom: 8px; }
    .skip-btn:hover { border-color: ${primaryColor}40; }
    .date-picker { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    .date-btn {
      flex-shrink: 0; width: 58px; padding: 8px 2px;
      border: 2px solid #e9ecef; border-radius: 10px;
      background: #fff; cursor: pointer; text-align: center;
      font-size: 12px; transition: all 0.15s ease;
    }
    .date-btn:hover { border-color: ${primaryColor}40; }
    .date-btn.selected { border-color: ${primaryColor}; background: ${primaryColor}12; }
    .date-btn .dow { font-size: 10px; color: #6c757d; }
    .date-btn .day { font-size: 16px; font-weight: 700; }
    .date-btn .mon { font-size: 9px; color: #6c757d; }
    .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .time-btn {
      padding: 10px; border: 2px solid #e9ecef; border-radius: 8px;
      background: #fff; cursor: pointer; font-size: 13px; font-weight: 500;
      text-align: center; transition: all 0.15s ease;
    }
    .time-btn:hover { border-color: ${primaryColor}40; }
    .time-btn.selected { border-color: ${primaryColor}; background: ${primaryColor}12; }
    .time-btn.unavailable { opacity: 0.3; cursor: not-allowed; text-decoration: line-through; }
    .no-slots { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 11px 14px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; }
    .form-group input:focus { outline: none; border-color: ${primaryColor}; }
    .btn-primary {
      width: 100%; padding: 13px; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 600; color: #fff; cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-back {
      display: block; width: 100%; padding: 10px;
      border: none; background: none; cursor: pointer;
      font-size: 13px; color: #6c757d; text-align: center; margin-top: 8px;
    }
    .btn-back:hover { color: #1a1a2e; }
    .step-bar { display: flex; gap: 4px; margin-bottom: 16px; }
    .step-bar .s { flex: 1; text-align: center; }
    .step-bar .s .dot { width: 24px; height: 24px; margin: 0 auto 2px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
    .step-bar .s .label { font-size: 9px; }
    .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .summary-item:last-child { border-bottom: none; font-weight: 700; }
    .card { margin-bottom: 12px; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 30px; }
    .spinner { width: 28px; height: 28px; border: 3px solid #e9ecef; border-top-color: ${primaryColor}; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success { text-align: center; padding: 40px 20px; }
    .success .icon { font-size: 48px; margin-bottom: 12px; }
    .success h2 { font-size: 20px; margin-bottom: 8px; }
    .success p { color: #6c757d; font-size: 14px; margin-bottom: 4px; }
    .msg { padding: 10px 14px; border-radius: 10px; margin-bottom: 10px; font-size: 13px; }
    .msg.error { background: #fff0f0; color: #d32f2f; border: 1px solid #ffcdd2; }
    ${widget.custom_css || ''}
  </style>
</head>
<body>
  <h1>${widget.header_text || 'Book an Appointment'}</h1>
  <p class="subtitle">${businessName}${widget.show_services ? ' — Select a service to get started' : ''}</p>
  <div id="widget-app"></div>
  <script>
    var API = '${apiBase}';
    var COL = '${primaryColor}';
    var SHOW_STAFF = ${showStaff};
    var SHOW_SVC = ${showServices};

    var state = { services: [], staff: [], step: 0, service: null, staff: null, date: null, time: null, name: '', email: '', phone: '' };
    // Build step renderers dynamically based on show/hide config
    var stepRenderers = [];
    if (SHOW_SVC) stepRenderers.push('services');
    if (SHOW_STAFF) stepRenderers.push('staff');
    stepRenderers.push('datetime', 'info', 'confirm');

    async function load() {
      try {
        var [sr, stf] = await Promise.all([
          fetch(API + '/services').then(function(r) { return r.json(); }),
          SHOW_STAFF ? fetch(API + '/staff').then(function(r) { return r.json(); }) : Promise.resolve({ staff: [] }),
        ]);
        state.services = sr.services || [];
        state.staff = stf.staff || [];
        render();
      } catch(e) { showMsg('Failed to load. Please try again.'); }
    }

    var stepLabels = { services: 'Service', staff: 'Staff', datetime: 'Date & Time', info: 'Your Info', confirm: 'Confirm' };

    function render() {
      var el = document.getElementById('widget-app');
      var stepIdx = state.step;
      var html = '<div class="step-bar">';
      for (var i = 0; i < stepRenderers.length; i++) {
        var done = i < stepIdx, active = i === stepIdx;
        html += '<div class="s"><div class="dot" style="background:' + (done ? COL : active ? COL + '22' : '#e9ecef') + ';color:' + (done || active ? '#fff' : '#999') + '">' + (done ? '\u2713' : (i + 1)) + '</div><div class="label" style="color:' + (done || active ? '#1a1a2e' : '#999') + ';font-weight:' + (active ? '700' : '400') + '">' + stepLabels[stepRenderers[i]] + '</div></div>';
      }
      html += '</div>';

      var current = stepRenderers[stepIdx];
      if (current === 'services') html += renderServices();
      else if (current === 'staff') html += renderStaff();
      else if (current === 'datetime') html += renderDateTime();
      else if (current === 'info') html += renderInfo();
      else if (current === 'confirm') html += renderConfirm();

      el.innerHTML = html;
    }

    function renderServices() {
      var h = '<div class="card"><div class="service-grid">';
      if (state.services.length === 0) h += '<p style="color:#6c757d;font-size:14px">No services available</p>';
      state.services.forEach(function(s) {
        var sel = state.service && state.service.id === s.id;
        h += '<button class="service-btn' + (sel ? ' selected' : '') + '" onclick="selectSvc(' + s.id + ')"><div class="name">' + s.name + '</div><div class="meta"><span>' + s.duration + ' min</span><span class="price" style="color:' + COL + '">$' + parseFloat(s.price).toFixed(2) + '</span></div></button>';
      });
      h += '</div></div>';
      return h;
    }

    function renderStaff() {
      var h = '<div class="card">';
      if (state.staff.length === 0) {
        h += '<p style="margin-bottom:10px;color:#6c757d;font-size:14px">No specific provider needed.</p>';
        h += '<button class="skip-btn" onclick="selectStf(null)">Skip — Any Available</button>';
      }
      state.staff.forEach(function(m) {
        var sel = state.staff && state.staff.id === m.id;
        h += '<button class="staff-btn' + (sel ? ' selected' : '') + '" onclick="selectStf(' + m.id + ')"><div class="avatar" style="background:' + (m.color || COL) + '">' + (m.name ? m.name.charAt(0).toUpperCase() : '?') + '</div><div class="info"><div class="name">' + (m.name || 'Staff') + '</div>' + (m.title ? '<div class="title">' + m.title + '</div>' : '') + '</div></button>';
      });
      if (state.staff.length > 0) h += '<button class="skip-btn" onclick="selectStf(null)">Skip — Any Available</button>';
      h += '</div>';
      return h;
    }

    function renderDateTime() {
      var h = '<div class="card">';
      var today = new Date();
      h += '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Date</label><div class="date-picker">';
      for (var i = 0; i < 14; i++) {
        var d = new Date(today); d.setDate(d.getDate() + i);
        var ds = d.toISOString().slice(0, 10);
        var sel = state.date === ds;
        var dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
        h += '<button class="date-btn' + (sel ? ' selected' : '') + '" onclick="selectDate(\'' + ds + '\')"><div class="dow">' + dow + '</div><div class="day">' + d.getDate() + '</div><div class="mon">' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + '</div></button>';
      }
      h += '</div>';
      h += '<div id="time-slots" style="margin-top:12px">' + (state.date ? '<div class="loading"><div class="spinner"></div></div>' : '<div class="no-slots">Select a date to see times</div>') + '</div>';
      h += '</div>';
      return h;
    }

    function renderInfo() {
      var h = '<div class="card"><div class="form-group"><label>Name *</label><input type="text" id="f-name" value="' + state.name + '" placeholder="Your full name" oninput="state.name=this.value" /></div><div class="form-group"><label>Email *</label><input type="email" id="f-email" value="' + state.email + '" placeholder="your@email.com" oninput="state.email=this.value" /></div>';
      h += '<div style="margin-top:14px"><button class="btn-primary" style="background:' + COL + '" onclick="goConfirm()">Continue to Review</button></div></div>';
      return h;
    }

    function renderConfirm() {
      var s = state.service;
      var stfName = state.staff ? state.staff.name : 'Any Available';
      var h = '<div class="card">';
      h += '<div class="summary-item"><span>Service</span><span style="font-weight:600">' + (s ? s.name : '') + '</span></div>';
      h += '<div class="summary-item"><span>Duration</span><span>' + (s ? s.duration : '') + ' min</span></div>';
      h += '<div class="summary-item"><span>Provider</span><span>' + stfName + '</span></div>';
      h += '<div class="summary-item"><span>Date</span><span>' + (state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '') + '</span></div>';
      h += '<div class="summary-item"><span>Time</span><span>' + (state.time || '') + '</span></div>';
      h += '<div class="summary-item" style="border-bottom:none;font-size:16px;padding-top:10px"><span>Price</span><span style="color:' + COL + '">$' + (s ? parseFloat(s.price).toFixed(2) : '0.00') + '</span></div>';
      h += '<div style="margin-top:14px"><button class="btn-primary" style="background:' + COL + '" onclick="book()" id="book-btn">Confirm Booking</button></div></div>';
      return h;
    }

    function selectSvc(id) { state.service = state.services.find(function(s) { return s.id === id; }); state.step++; render(); }
    function selectStf(id) { state.staff = id ? state.staff.find(function(m) { return m.id === id; }) : null; state.step++; render(); }
    function selectTime(t) { state.time = t; state.step++; render(); }

    var slotsCache = {};
    function selectDate(ds) {
      state.date = ds; state.time = null; render();
      if (slotsCache[ds]) { showSlots(slotsCache[ds]); return; }
      fetch(API + '/availability?date=' + ds + (state.staff ? '&staff_id=' + state.staff.id : '')).then(function(r) { return r.json(); }).then(function(d) { slotsCache[ds] = d.slots || []; showSlots(d.slots || []); }).catch(function(){});
    }

    function showSlots(slots) {
      var el = document.getElementById('time-slots');
      if (!el) return;
      if (!slots || slots.length === 0) { el.innerHTML = '<div class="no-slots">No available times</div>'; return; }
      var h = '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Time</label><div class="time-grid">';
      slots.forEach(function(s) { h += '<button class="time-btn" onclick="selectTime(\'' + s.time + '\')">' + s.time + '</button>'; });
      h += '</div>';
      el.innerHTML = h;
    }

    function goConfirm() {
      var name = document.getElementById('f-name')?.value?.trim();
      var email = document.getElementById('f-email')?.value?.trim();
      if (!name) { showMsg('Please enter your name'); return; }
      if (!email || !email.includes('@')) { showMsg('Please enter a valid email'); return; }
      state.name = name; state.email = email; state.step++; render();
    }

    async function book() {
      var btn = document.getElementById('book-btn');
      btn.disabled = true; btn.textContent = 'Booking...';
      try {
        var res = await fetch(API + '/book', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_id: state.service.id, staff_id: state.staff ? state.staff.id : null, date: state.date, time: state.time, name: state.name, email: state.email }),
        });
        var d = await res.json();
        if (res.ok) {
          document.getElementById('widget-app').innerHTML = '<div class="success"><div class="icon">\u2705</div><h2>Booking Confirmed!</h2><p>' + (state.service ? state.service.name : '') + '</p><p>' + new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + state.time + '</p></div>';
          // Notify parent iframe
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'booking_confirmed' }, '*');
          }
        } else {
          showMsg(d.error || 'Booking failed'); btn.disabled = false; btn.textContent = 'Confirm Booking';
        }
      } catch(e) { showMsg('Network error'); btn.disabled = false; btn.textContent = 'Confirm Booking'; }
    }

    function showMsg(msg) {
      var el = document.getElementById('widget-msg');
      if (!el) { el = document.createElement('div'); el.id = 'widget-msg'; document.getElementById('widget-app').prepend(el); }
      el.innerHTML = msg ? '<div class="msg error">' + msg + '</div>' : '';
    }

    load();
  </script>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    logger.error({ err }, 'Failed to render widget page');
    sendError(res, 500, 'Failed to load widget');
  }
});

// ─── Public: Widget booking endpoint ────────────────────

router.post('/:token/book', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) return sendNotFoundError(res, 'Widget not found or inactive');

    const { service_id, staff_id, date, time, name, email } = req.body;
    if (!service_id || !date || !time || !name || !email) {
      return sendValidationError(res, 'service_id, date, time, name, and email are required');
    }

    const service = await queryOne('SELECT * FROM services WHERE id = $1 AND is_active = 1', [service_id]);
    if (!service) return sendNotFoundError(res, 'Service not found');

    // Find or create user
    let user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const result = await run(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, hashedPassword, 'customer']
      );
      user = await queryOne('SELECT * FROM users WHERE id = $1', [result.lastInsertRowid]);
    }

    // Check blacklist
    const blacklisted = await queryOne('SELECT * FROM customer_blacklist WHERE user_id = $1 AND is_active = 1', [user.id]);
    if (blacklisted) return sendError(res, 403, 'Unable to complete booking at this time');

    // Create appointment
    const result = await run(`
      INSERT INTO appointments (user_id, service_id, date, time, status, notes)
      VALUES ($1, $2, $3, $4, 'confirmed', $5)
      RETURNING id
    `, [user.id, service_id, date, time, 'Booking via widget']);

    if (staff_id) {
      await run('INSERT INTO staff_appointments (appointment_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [result.lastInsertRowid, staff_id]);
    }

    logger.info({ appointmentId: result.lastInsertRowid, widget: widget.id }, 'Widget booking created');
    res.status(201).json({ success: true, appointment: { id: result.lastInsertRowid }, message: 'Booking confirmed!' });
  } catch (err) {
    logger.error({ err }, 'Widget booking failed');
    sendError(res, 500, err.message || 'Booking failed');
  }
});

// ─── Public: Widget availability ────────────────────────

router.get('/:token/availability', async (req, res) => {
  try {
    const widget = await queryOne(
      'SELECT * FROM booking_widgets WHERE widget_token = $1 AND is_active = 1',
      [req.params.token]
    );
    if (!widget) return sendNotFoundError(res, 'Widget not found or inactive');

    const { date } = req.query;
    if (!date) return sendValidationError(res, 'date parameter required (YYYY-MM-DD)');

    // Generate generic time slots (no staff config needed for basic widget)
    const slots = [];
    for (let h = 9; h < 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push({ time, available: true });
      }
    }

    res.json({ slots, date });
  } catch (err) {
    logger.error({ err }, 'Failed to load widget availability');
    sendError(res, 500, 'Failed to load availability');
  }
});

module.exports = router;
