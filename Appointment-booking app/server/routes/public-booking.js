/**
 * Public Booking Page & Embeddable Widget Route
 *
 * GET    /book/:slug                    Full HTML booking page (no auth required)
 * GET    /api/book/:slug/config         JSON config for the booking page
 * GET    /api/book/:slug/services       Services available on this page
 * GET    /api/book/:slug/staff          Staff available on this page
 * GET    /api/book/:slug/availability   Available slots for a date
 * POST   /api/book/:slug/book           Create a guest booking
 * GET    /api/book/:slug/embed.js       Embeddable JS widget for external sites
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const path = require('path');
const { queryOne, queryAll, run } = require('../db');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Helper: load page config ───────────────────────

async function loadPageConfig(slug) {
  const page = await queryOne(
    'SELECT * FROM public_booking_pages WHERE slug = $1 AND is_active = 1',
    [slug]
  );
  if (!page) return null;

  const settings = await queryOne('SELECT business_name, business_description, primary_color, logo_url FROM business_settings LIMIT 1');

  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    allowed_services: page.allowed_services,
    allowed_staff: page.allowed_staff,
    require_auth: !!page.require_auth,
    require_phone: !!page.require_phone,
    redirect_url: page.redirect_url,
    custom_css: page.custom_css,
    seo_description: page.seo_description,
    business: {
      name: settings?.business_name || 'My Business',
      description: settings?.business_description || '',
      primary_color: settings?.primary_color || '#e11d48',
      logo_url: settings?.logo_url || null,
    },
  };
}

// ─── GET /book/:slug — Full HTML booking page ──────

router.get('/book/:slug', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');

    const host = `${req.protocol}://${req.get('host')}`;
    const apiBase = `${host}/api/book/${req.params.slug}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title} — ${config.business.name}</title>
  <meta name="description" content="${config.seo_description || `Book appointments with ${config.business.name}`}" />
  <meta property="og:title" content="${config.title} — ${config.business.name}" />
  <meta property="og:description" content="${config.seo_description || `Book appointments with ${config.business.name}`}" />
  <meta name="robots" content="index, follow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      min-height: 100vh;
      color: #1a1a2e;
    }
    .app { max-width: 520px; margin: 0 auto; padding: 24px 16px 60px; }
    .header { text-align: center; margin-bottom: 28px; }
    .header h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
    .header p { font-size: 14px; color: #6c757d; }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      margin-bottom: 16px;
    }
    .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #1a1a2e; }
    .card h2 .step { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; color: #fff; margin-right: 8px; }
    .service-grid { display: grid; gap: 8px; }
    .service-btn, .staff-btn {
      display: block; width: 100%; padding: 14px 16px;
      border: 2px solid #e9ecef; border-radius: 12px;
      background: #fff; cursor: pointer; text-align: left;
      font-size: 14px; transition: all 0.15s ease;
    }
    .service-btn:hover, .staff-btn:hover { border-color: ${config.business.primary_color}40; background: ${config.business.primary_color}08; }
    .service-btn.selected, .staff-btn.selected { border-color: ${config.business.primary_color}; background: ${config.business.primary_color}12; }
    .service-btn .name { font-weight: 600; color: #1a1a2e; }
    .service-btn .meta { display: flex; gap: 12px; margin-top: 4px; font-size: 13px; color: #6c757d; }
    .service-btn .price { font-weight: 600; }
    .staff-btn { display: flex; align-items: center; gap: 12px; }
    .staff-btn .avatar {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px; color: #fff; flex-shrink: 0;
    }
    .staff-btn .info { flex: 1; }
    .staff-btn .info .name { font-weight: 600; color: #1a1a2e; }
    .staff-btn .info .title { font-size: 12px; color: #6c757d; }
    .date-picker { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .date-btn {
      flex-shrink: 0; width: 64px; padding: 10px 4px;
      border: 2px solid #e9ecef; border-radius: 12px;
      background: #fff; cursor: pointer; text-align: center;
      transition: all 0.15s ease;
    }
    .date-btn:hover { border-color: ${config.business.primary_color}40; }
    .date-btn.selected { border-color: ${config.business.primary_color}; background: ${config.business.primary_color}12; }
    .date-btn .dow { font-size: 11px; color: #6c757d; font-weight: 500; }
    .date-btn .day { font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .date-btn .mon { font-size: 10px; color: #6c757d; }
    .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .time-btn {
      padding: 10px; border: 2px solid #e9ecef; border-radius: 10px;
      background: #fff; cursor: pointer; font-size: 13px; font-weight: 500;
      text-align: center; transition: all 0.15s ease;
    }
    .time-btn:hover:not(.unavailable) { border-color: ${config.business.primary_color}40; }
    .time-btn.selected { border-color: ${config.business.primary_color}; background: ${config.business.primary_color}12; }
    .time-btn.unavailable { opacity: 0.3; cursor: not-allowed; text-decoration: line-through; }
    .no-slots { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }
    .form-group input {
      width: 100%; padding: 12px 14px; border: 2px solid #e9ecef; border-radius: 10px;
      font-size: 14px; transition: border-color 0.15s ease;
    }
    .form-group input:focus { outline: none; border-color: ${config.business.primary_color}; }
    .btn-primary {
      width: 100%; padding: 14px; border: none; border-radius: 12px;
      font-size: 16px; font-weight: 600; color: #fff; cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 12px;
      background: #fff; font-size: 14px; font-weight: 500; cursor: pointer;
      margin-bottom: 8px; transition: all 0.15s ease;
    }
    .btn-secondary:hover { background: #f8f9fa; }
    .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .summary-item:last-child { border-bottom: none; font-weight: 700; }
    .summary-label { color: #6c757d; }
    .summary-value { color: #1a1a2e; }
    .hidden { display: none !important; }
    .message { padding: 12px 16px; border-radius: 10px; margin-bottom: 12px; font-size: 13px; }
    .message.error { background: #fff0f0; color: #d32f2f; border: 1px solid #ffcdd2; }
    .message.success { background: #f0fff4; color: #2e7d32; border: 1px solid #c8e6c9; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 40px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e9ecef; border-top-color: ${config.business.primary_color}; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    ${config.custom_css || ''}
  </style>
</head>
<body>
  <div class="app" id="app">
    <div class="header">
      ${config.business.logo_url ? `<img src="${config.business.logo_url}" alt="${config.business.name}" style="height:48px;margin-bottom:8px" />` : ''}
      <h1>${config.title}</h1>
      <p>${config.business.description}</p>
    </div>
    <div id="booking-widget"></div>
  </div>

  <script>
    const API = '${apiBase}';
    const COLORS = { primary: '${config.business.primary_color}' };
    const REQUIRE_PHONE = ${config.require_phone};
    const REDIRECT_URL = ${config.redirect_url ? `'${config.redirect_url}'` : 'null'};

    let state = { services: [], staff: [], selectedService: null, selectedStaff: null, selectedDate: null, selectedTime: null, customerName: '', customerEmail: '', customerPhone: '', step: 1 };

    async function loadData() {
      try {
        const [svcRes, stfRes] = await Promise.all([
          fetch(API + '/services').then(r => r.json()),
          fetch(API + '/staff').then(r => r.json()),
        ]);
        state.services = svcRes.services || [];
        state.staff = stfRes.staff || [];
        render();
      } catch (err) { showError('Failed to load booking data. Please try again.'); }
    }

    function render() {
      const steps = ['Service', 'Staff', 'Date & Time', 'Your Info', 'Confirm'];
      const currentStep = Math.min(state.step, 5);

      let html = '';
      html += '<div style="display:flex;gap:4px;margin-bottom:20px">';
      steps.forEach((s, i) => {
        const idx = i + 1;
        const done = idx < currentStep;
        const active = idx === currentStep;
        html += '<div style="flex:1;text-align:center">';
        html += '<div style="width:28px;height:28px;margin:0 auto 4px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;' +
          (done ? 'background:' + COLORS.primary + ';color:#fff' : active ? 'border:2px solid ' + COLORS.primary + ';color:' + COLORS.primary : 'background:#e9ecef;color:#999') + '">' + (done ? '✓' : idx) + '</div>';
        html += '<div style="font-size:10px;color:' + (active || done ? '#1a1a2e' : '#999') + ';font-weight:' + (active ? '700' : '400') + '">' + s + '</div>';
        html += '</div>';
      });
      html += '</div>';

      if (currentStep === 1) html += renderStep1();
      else if (currentStep === 2) html += renderStep2();
      else if (currentStep === 3) html += renderStep3();
      else if (currentStep === 4) html += renderStep4();
      else if (currentStep === 5) html += renderStep5();

      document.getElementById('booking-widget').innerHTML = html;
    }

    // ─── Step 1: Select Service ────────────────────────
    function renderStep1() {
      let h = '<div class="card"><h2><span class="step" style="background:' + COLORS.primary + '">1</span>Select Service</h2><div class="service-grid">';
      if (state.services.length === 0) h += '<p style="color:#6c757d">No services available</p>';
      state.services.forEach(s => {
        const sel = state.selectedService?.id === s.id;
        h += '<button class="service-btn' + (sel ? ' selected' : '') + '" onclick="selectService(' + s.id + ')">';
        h += '<div class="name">' + s.name + '</div>';
        h += '<div class="meta"><span>' + s.duration + ' min</span><span class="price" style="color:' + COLORS.primary + '">$' + parseFloat(s.price).toFixed(2) + '</span></div>';
        if (s.description) h += '<div style="font-size:12px;color:#6c757d;margin-top:4px">' + s.description + '</div>';
        h += '</button>';
      });
      h += '</div></div>';
      return h;
    }

    function selectService(id) {
      state.selectedService = state.services.find(s => s.id === id);
      state.step = 2;
      render();
    }

    // ─── Step 2: Select Staff ─────────────────────────
    function renderStep2() {
      let h = '<div class="card"><h2><span class="step" style="background:' + COLORS.primary + '">2</span>Select Provider</h2>';
      if (state.staff.length === 0) {
        h += '<p style="margin-bottom:12px;color:#6c757d;font-size:14px">No specific provider needed — we\'ll assign the best available.</p>';
        h += '<button class="btn-secondary" onclick="selectStaff(null)">Skip — Any Available</button>';
      }
      state.staff.forEach(m => {
        const sel = state.selectedStaff?.id === m.id;
        h += '<button class="staff-btn' + (sel ? ' selected' : '') + '" onclick="selectStaff(' + m.id + ')">';
        h += '<div class="avatar" style="background:' + (m.color || COLORS.primary) + '">' + (m.name ? m.name.charAt(0).toUpperCase() : '?') + '</div>';
        h += '<div class="info"><div class="name">' + (m.name || 'Staff') + '</div>';
        if (m.title) h += '<div class="title">' + m.title + '</div>';
        h += '</div></button>';
      });
      h += '<div style="margin-top:12px"><button class="btn-secondary" onclick="goBack(1)">← Back to Services</button></div>';
      h += '</div>';
      return h;
    }

    function selectStaff(id) {
      state.selectedStaff = id ? state.staff.find(m => m.id === id) : null;
      state.step = 3;
      render();
    }

    // ─── Step 3: Date & Time ─────────────────────────
    function renderStep3() {
      let h = '<div class="card"><h2><span class="step" style="background:' + COLORS.primary + '">3</span>Pick Date & Time</h2>';
      h += renderDates();
      h += renderTimes();
      h += '<div style="margin-top:12px"><button class="btn-secondary" onclick="goBack(2)">← Back to Provider</button></div>';
      h += '</div>';
      return h;
    }

    function renderDates() {
      let h = '<div style="margin-bottom:16px"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Date</label><div class="date-picker">';
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(today); d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        const sel = state.selectedDate === ds;
        const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
        h += '<button class="date-btn' + (sel ? ' selected' : '') + '" onclick="selectDate(\'' + ds + '\')">';
        h += '<div class="dow">' + dow + '</div><div class="day">' + d.getDate() + '</div>';
        h += '<div class="mon">' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + '</div>';
        h += '</button>';
      }
      h += '</div></div>';
      return h;
    }

    function renderTimes() {
      if (!state.selectedDate) return '<div class="no-slots">Select a date to see available times</div>';
      return '<div id="time-slots"><div class="loading"><div class="spinner"></div></div></div>';
    }

    let slotsCache = {};
    async function selectDate(dateStr) {
      state.selectedDate = dateStr;
      state.selectedTime = null;
      render();

      // Fetch slots
      if (slotsCache[dateStr]) { showSlots(slotsCache[dateStr]); return; }
      try {
        let url = API + '/availability?date=' + dateStr;
        if (state.selectedStaff) url += '&staff_id=' + state.selectedStaff.id;
        const res = await fetch(url);
        const data = await res.json();
        slotsCache[dateStr] = data.slots || [];
        showSlots(data.slots || []);
      } catch { /* silent */ }
    }

    function showSlots(slots) {
      const container = document.getElementById('time-slots');
      if (!container) return;
      if (!slots || slots.length === 0) {
        container.innerHTML = '<div class="no-slots">No available slots for this date</div>';
        return;
      }
      let h = '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Time</label><div class="time-grid">';
      slots.forEach(s => {
        const available = s.available !== false;
        const sel = state.selectedTime === s.time;
        h += '<button class="time-btn' + (sel ? ' selected' : '') + (available ? '' : ' unavailable') + '" onclick="' + (available ? 'selectTime(\'' + s.time + '\')' : '') + '">' + s.time + '</button>';
      });
      h += '</div>';
      container.innerHTML = h;
    }

    function selectTime(time) {
      state.selectedTime = time;
      state.step = 4;
      render();
    }

    // ─── Step 4: Customer Info ────────────────────────
    function renderStep4() {
      let h = '<div class="card"><h2><span class="step" style="background:' + COLORS.primary + '">4</span>Your Information</h2>';
      h += '<div class="form-group"><label>Name *</label><input type="text" id="cust-name" value="' + state.customerName + '" placeholder="Your full name" oninput="state.customerName=this.value" /></div>';
      h += '<div class="form-group"><label>Email *</label><input type="email" id="cust-email" value="' + state.customerEmail + '" placeholder="your@email.com" oninput="state.customerEmail=this.value" /></div>';
      if (REQUIRE_PHONE) {
        h += '<div class="form-group"><label>Phone *</label><input type="tel" id="cust-phone" value="' + state.customerPhone + '" placeholder="+1 (555) 123-4567" oninput="state.customerPhone=this.value" /></div>';
      }
      h += '<div style="margin-top:16px"><button class="btn-primary" style="background:' + COLORS.primary + '" onclick="goToConfirm()">Continue to Review</button></div>';
      h += '<div style="margin-top:8px"><button class="btn-secondary" onclick="goBack(3)">← Back to Time</button></div>';
      h += '</div>';
      return h;
    }

    function goToConfirm() {
      const name = document.getElementById('cust-name')?.value?.trim();
      const email = document.getElementById('cust-email')?.value?.trim();
      const phone = document.getElementById('cust-phone')?.value?.trim();
      if (!name) { showError('Please enter your name'); return; }
      if (!email || !email.includes('@')) { showError('Please enter a valid email'); return; }
      if (REQUIRE_PHONE && !phone) { showError('Please enter your phone number'); return; }
      state.customerName = name; state.customerEmail = email; state.customerPhone = phone || '';
      state.step = 5; render();
    }

    // ─── Step 5: Confirm & Book ──────────────────────
    function renderStep5() {
      const s = state.selectedService;
      const staffName = state.selectedStaff?.name || 'Any Available';
      let h = '<div class="card"><h2><span class="step" style="background:' + COLORS.primary + '">5</span>Review & Confirm</h2>';
      h += '<div class="summary-item"><span class="summary-label">Service</span><span class="summary-value">' + (s?.name || '') + '</span></div>';
      h += '<div class="summary-item"><span class="summary-label">Duration</span><span class="summary-value">' + (s?.duration || '') + ' min</span></div>';
      h += '<div class="summary-item"><span class="summary-label">Provider</span><span class="summary-value">' + staffName + '</span></div>';
      h += '<div class="summary-item"><span class="summary-label">Date</span><span class="summary-value">' + (state.selectedDate ? new Date(state.selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '') + '</span></div>';
      h += '<div class="summary-item"><span class="summary-label">Time</span><span class="summary-value">' + (state.selectedTime || '') + '</span></div>';
      h += '<div class="summary-item"><span class="summary-label">Customer</span><span class="summary-value">' + state.customerName + '</span></div>';
      h += '<div class="summary-item" style="border-bottom:none;font-size:16px;padding-top:12px"><span class="summary-label">Price</span><span class="summary-value" style="color:' + COLORS.primary + '">$' + (s ? parseFloat(s.price).toFixed(2) : '0.00') + '</span></div>';
      h += '<div style="margin-top:16px"><button class="btn-primary" style="background:' + COLORS.primary + '" onclick="confirmBooking()" id="book-btn">Confirm Booking</button></div>';
      h += '<div style="margin-top:8px"><button class="btn-secondary" onclick="goBack(4)">← Edit Details</button></div>';
      h += '</div>';
      return h;
    }

    async function confirmBooking() {
      const btn = document.getElementById('book-btn');
      btn.disabled = true; btn.textContent = 'Booking...';
      showError('');

      try {
        const res = await fetch(API + '/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: state.selectedService.id,
            staff_id: state.selectedStaff?.id || null,
            date: state.selectedDate,
            time: state.selectedTime,
            name: state.customerName,
            email: state.customerEmail,
            phone: state.customerPhone || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById('booking-widget').innerHTML =
            '<div class="card" style="text-align:center;padding:40px">' +
            '<div style="font-size:48px;margin-bottom:16px">✅</div>' +
            '<h2 style="margin-bottom:8px;color:#1a1a2e">Booking Confirmed!</h2>' +
            '<p style="color:#6c757d;margin-bottom:4px">' + state.selectedService.name + '</p>' +
            '<p style="color:#6c757d;margin-bottom:4px">' + new Date(state.selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + state.selectedTime + '</p>' +
            (REDIRECT_URL ? '<div style="margin-top:20px"><a href="' + REDIRECT_URL + '" class="btn-primary" style="display:inline-block;padding:12px 24px;text-decoration:none;background:' + COLORS.primary + ';color:#fff;border-radius:12px">Done</a></div>' : '') +
            '</div>';
        } else {
          showError(data.error || 'Booking failed. Please try again.');
          btn.disabled = false; btn.textContent = 'Confirm Booking';
        }
      } catch (err) {
        showError('Network error. Please try again.');
        btn.disabled = false; btn.textContent = 'Confirm Booking';
      }
    }

    // ─── Utilities ──────────────────────────────────
    function goBack(step) { state.step = step; render(); }
    function showError(msg) {
      let el = document.getElementById('widget-msg');
      if (!el) {
        el = document.createElement('div'); el.id = 'widget-msg';
        document.getElementById('booking-widget').prepend(el);
      }
      el.innerHTML = msg ? '<div class="message error">' + msg + '</div>' : '';
    }

    loadData();
  </script>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    logger.error({ err }, 'Failed to render booking page');
    sendError(res, 500, 'Failed to load booking page');
  }
});

// ─── GET /api/book/:slug/config — JSON config ───────

router.get('/api/book/:slug/config', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');
    res.json({ config });
  } catch (err) {
    logger.error({ err }, 'Failed to load booking config');
    sendError(res, 500, 'Failed to load booking config');
  }
});

// ─── GET /api/book/:slug/services — Services ────────

router.get('/api/book/:slug/services', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');

    let services;
    if (config.allowed_services && config.allowed_services.length > 0) {
      services = await queryAll(
        'SELECT id, name, description, duration, price, category FROM services WHERE id = ANY($1) AND is_active = 1 ORDER BY category, name',
        [config.allowed_services]
      );
    } else {
      services = await queryAll(
        'SELECT id, name, description, duration, price, category FROM services WHERE is_active = 1 ORDER BY category, name'
      );
    }
    res.json({ services });
  } catch (err) {
    logger.error({ err }, 'Failed to load booking services');
    sendError(res, 500, 'Failed to load services');
  }
});

// ─── GET /api/book/:slug/staff — Staff ─────────────

router.get('/api/book/:slug/staff', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');

    let staff;
    if (config.allowed_staff && config.allowed_staff.length > 0) {
      staff = await queryAll(
        'SELECT sm.id, sm.user_id, u.name, sm.title, sm.bio, sm.color, sm.phone FROM staff_members sm JOIN users u ON sm.user_id = u.id WHERE sm.id = ANY($1) AND sm.is_active = 1 ORDER BY u.name',
        [config.allowed_staff]
      );
    } else {
      staff = await queryAll(
        'SELECT sm.id, sm.user_id, u.name, sm.title, sm.bio, sm.color, sm.phone FROM staff_members sm JOIN users u ON sm.user_id = u.id WHERE sm.is_active = 1 ORDER BY u.name'
      );
    }
    res.json({ staff });
  } catch (err) {
    logger.error({ err }, 'Failed to load booking staff');
    sendError(res, 500, 'Failed to load staff');
  }
});

// ─── GET /api/book/:slug/availability — Slots ──────

router.get('/api/book/:slug/availability', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');

    const { date, staff_id } = req.query;
    if (!date) return sendValidationError(res, 'date query parameter is required (YYYY-MM-DD)');

    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    // Get all active staff (or filter by allowed/requested)
    let staffList;
    if (staff_id) {
      const member = await queryOne('SELECT * FROM staff_members WHERE id = $1 AND is_active = 1', [staff_id]);
      staffList = member ? [member] : [];
    } else if (config.allowed_staff && config.allowed_staff.length > 0) {
      staffList = await queryAll('SELECT * FROM staff_members WHERE id = ANY($1) AND is_active = 1', [config.allowed_staff]);
    } else {
      staffList = await queryAll('SELECT * FROM staff_members WHERE is_active = 1');
    }

    if (staffList.length === 0) {
      // No staff configuration — generate generic slots
      const slots = [];
      for (let h = 9; h < 17; h++) {
        for (let m = 0; m < 60; m += 30) {
          const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          slots.push({ time, available: true });
        }
      }
      return res.json({ slots, date });
    }

    // Collect all available slots from all staff
    const allSlots = {};
    for (const member of staffList) {
      const exception = await queryOne(
        'SELECT * FROM staff_exceptions WHERE staff_id = $1 AND exception_date = $2',
        [member.id, date]
      );
      if (exception && !exception.is_available) continue;

      let timeSlots = [];
      if (exception && exception.is_available && exception.start_time) {
        timeSlots = [{ start_time: exception.start_time, end_time: exception.end_time }];
      } else {
        timeSlots = await queryAll(
          'SELECT * FROM staff_availability WHERE staff_id = $1 AND day_of_week = $2 AND is_active = 1 ORDER BY start_time',
          [member.id, dayOfWeek]
        );
      }

      const bookedTimes = await queryAll(`
        SELECT a.time, s.duration FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN staff_appointments sa ON sa.appointment_id = a.id
        WHERE sa.staff_id = $1 AND a.date = $2 AND a.status = 'confirmed'
      `, [member.id, date]);

      for (const slot of timeSlots) {
        const [startH, startM] = slot.start_time.split(':').map(Number);
        const [endH, endM] = slot.end_time.split(':').map(Number);
        let current = startH * 60 + startM;
        const end = endH * 60 + endM;

        while (current + 30 <= end) {
          const hours = String(Math.floor(current / 60)).padStart(2, '0');
          const mins = String(current % 60).padStart(2, '0');
          const timeStr = `${hours}:${mins}`;

          const isBooked = bookedTimes.some(bt => {
            const [btH, btM] = bt.time.split(':').map(Number);
            const btStart = btH * 60 + btM;
            const btEnd = btStart + bt.duration;
            return current < btEnd && current + 30 > btStart;
          });

          if (!isBooked) {
            if (!allSlots[timeStr]) allSlots[timeStr] = { time: timeStr, available: true, staff_count: 0 };
            allSlots[timeStr].staff_count++;
          }
          current += 30;
        }
      }
    }

    const slots = Object.values(allSlots).sort((a, b) => a.time.localeCompare(b.time));
    res.json({ slots, date });
  } catch (err) {
    logger.error({ err }, 'Failed to load availability');
    sendError(res, 500, 'Failed to load availability');
  }
});

// ─── POST /api/book/:slug/book — Create booking ────

router.post('/api/book/:slug/book', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');

    const { service_id, staff_id, date, time, name, email, phone } = req.body;
    if (!service_id || !date || !time || !name || !email) {
      return sendValidationError(res, 'service_id, date, time, name, and email are required');
    }

    // Verify service exists and is active
    const service = await queryOne('SELECT * FROM services WHERE id = $1 AND is_active = 1', [service_id]);
    if (!service) return sendNotFoundError(res, 'Service not found');

    // Find or create user by email (guest checkout)
    let user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      // Create guest user with a random password
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

    // Check for time conflicts
    const conflict = await queryOne(`
      SELECT a.id FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.date = $1 AND a.status != 'cancelled'
      AND $2::time < (a.time::time + (s.duration || ' minutes')::interval)::time
      AND a.time::time < $3::time
    `, [date, time, time]);
    if (conflict) return sendError(res, 409, 'This time slot is already booked');

    // Create appointment
    const result = await run(`
      INSERT INTO appointments (user_id, service_id, date, time, status, notes)
      VALUES ($1, $2, $3, $4, 'confirmed', $5)
      RETURNING id
    `, [user.id, service_id, date, time, `Guest booking via ${config.slug}`]);

    // Link staff if provided
    if (staff_id) {
      await run('INSERT INTO staff_appointments (appointment_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [result.lastInsertRowid, staff_id]);
    }

    // Log audit event
    try {
      const { logAudit } = require('./admin-extended');
      await logAudit(null, 'appointment.create_guest', 'appointment', result.lastInsertRowid, { source: config.slug, guest: true });
    } catch { /* silent */ }

    logger.info({ appointmentId: result.lastInsertRowid, source: config.slug }, 'Guest booking created');

    res.status(201).json({
      success: true,
      appointment: { id: result.lastInsertRowid },
      message: 'Booking confirmed!',
      redirect_url: config.redirect_url || null,
    });
  } catch (err) {
    logger.error({ err }, 'Guest booking failed');
    sendError(res, 500, err.message || 'Booking failed');
  }
});

// ─── GET /api/book/:slug/embed.js — Embed script ──

router.get('/api/book/:slug/embed.js', async (req, res) => {
  try {
    const config = await loadPageConfig(req.params.slug);
    if (!config) return sendNotFoundError(res, 'Booking page not found');

    const pageUrl = `${req.protocol}://${req.get('host')}/book/${req.params.slug}`;

    const script = `(function() {
  var baseUrl = '${pageUrl}';
  var container = document.currentScript && document.currentScript.parentElement;

  if (!container) {
    var scripts = document.getElementsByTagName('script');
    container = scripts[scripts.length - 1].parentElement;
  }

  var iframe = document.createElement('iframe');
  iframe.src = baseUrl;
  iframe.style.width = '100%';
  iframe.style.height = '700px';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
  iframe.title = 'Book an Appointment';
  iframe.allow = 'payment';

  // Handle postMessage for height resizing
  window.addEventListener('message', function(e) {
    if (e.origin !== window.location.origin && e.data && e.data.type === 'resize') {
      iframe.style.height = e.data.height + 'px';
    }
  });

  container.appendChild(iframe);
})();`;

    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.send(script);
  } catch (err) {
    logger.error({ err }, 'Failed to generate embed script');
    res.status(500).type('text').send('console.error("Failed to load booking widget");');
  }
});

module.exports = router;
