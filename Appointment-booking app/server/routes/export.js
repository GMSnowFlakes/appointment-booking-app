/**
 * CSV Export Route — Download appointments, services, and revenue data as CSV.
 *
 * All endpoints require admin authentication.
 *
 * GET /export/appointments  — All appointments with customer & service details
 * GET /export/services      — All active services
 * GET /export/revenue       — Daily revenue breakdown (completed appointments only)
 */
const express = require('express');
const { queryAll } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError } = require('../errors');

const router = express.Router();

/**
 * Escape a CSV value per RFC 4180.
 * If the value contains commas, double-quotes, or newlines, wrap it in
 * double-quotes and escape internal double-quotes.
 */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Build a CSV string from an array of objects.
 * @param {string[]} columns — Ordered column names (also used as headers).
 * @param {object[]} rows — Array of row objects.
 * @param {object} [labelMap] — Optional map of column -> display header label.
 * @returns {string}
 */
function buildCsv(columns, rows, labelMap = {}) {
  const header = columns.map(col => csvEscape(labelMap[col] || col)).join(',');
  const body = rows.map(row =>
    columns.map(col => csvEscape(row[col])).join(',')
  );
  return header + '\r\n' + body.join('\r\n');
}

// ─── Admin auth — all export endpoints require admin ───────

router.use(authenticateToken, requireAdmin);

// ─── GET /export/appointments ──────────────────────────────

router.get('/appointments', async (req, res) => {
  try {
    const rows = await queryAll(`
      SELECT
        a.id,
        a.date,
        a.time,
        a.status,
        a.notes,
        a.created_at,
        u.name  AS customer_name,
        u.email AS customer_email,
        s.name  AS service_name,
        s.duration AS service_duration,
        s.price AS service_price,
        s.category AS service_category
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN services s ON a.service_id = s.id
      ORDER BY a.date DESC, a.time DESC
    `);

    const columns = [
      'id', 'date', 'time', 'status',
      'customer_name', 'customer_email',
      'service_name', 'service_duration', 'service_price', 'service_category',
      'notes', 'created_at',
    ];

    const labels = {
      id: 'Appointment ID',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      customer_name: 'Customer Name',
      customer_email: 'Customer Email',
      service_name: 'Service Name',
      service_duration: 'Duration (min)',
      service_price: 'Price',
      service_category: 'Category',
      notes: 'Notes',
      created_at: 'Created At',
    };

    const csv = buildCsv(columns, rows, labels);

    const filename = `appointments_${new Date().toISOString().slice(0, 10)}.csv`;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csv);

    logger.info({ count: rows.length }, 'Appointments CSV exported');
  } catch (err) {
    logger.error({ err }, 'Failed to export appointments CSV');
    sendError(res, 500, 'Failed to export appointments');
  }
});

// ─── GET /export/services ──────────────────────────────────

router.get('/services', async (req, res) => {
  try {
    const rows = await queryAll(`
      SELECT
        id,
        name,
        description,
        duration,
        price,
        category,
        is_active,
        created_at
      FROM services
      ORDER BY category, name
    `);

    const columns = ['id', 'name', 'description', 'duration', 'price', 'category', 'is_active', 'created_at'];
    const labels = {
      id: 'Service ID',
      name: 'Service Name',
      description: 'Description',
      duration: 'Duration (min)',
      price: 'Price',
      category: 'Category',
      is_active: 'Active',
      created_at: 'Created At',
    };

    const csv = buildCsv(columns, rows, labels);
    const filename = `services_${new Date().toISOString().slice(0, 10)}.csv`;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csv);

    logger.info({ count: rows.length }, 'Services CSV exported');
  } catch (err) {
    logger.error({ err }, 'Failed to export services CSV');
    sendError(res, 500, 'Failed to export services');
  }
});

// ─── GET /export/revenue ───────────────────────────────────

router.get('/revenue', async (req, res) => {
  try {
    const { period } = req.query;

    // Date filter (same pattern as analytics route)
    let dateFilter = '';
    if (period && period !== 'all') {
      const days = { '7d': 7, '30d': 30, '90d': 90, '12mo': 365 };
      const n = days[period];
      if (n) {
        dateFilter = `AND a.created_at >= NOW() - INTERVAL '${n} days'`;
      }
    }

    const rows = await queryAll(`
      SELECT
        a.date,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS revenue,
        COALESCE(SUM(s.price) / NULLIF(COUNT(*), 0)::numeric(10,2), 0) AS avg_booking_value
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completed' ${dateFilter}
      GROUP BY a.date
      ORDER BY a.date ASC
    `);

    const columns = ['date', 'bookings', 'revenue', 'avg_booking_value'];
    const labels = {
      date: 'Date',
      bookings: 'Bookings',
      revenue: 'Revenue',
      avg_booking_value: 'Avg Booking Value',
    };

    const csv = buildCsv(columns, rows, labels);
    const filename = `revenue_${new Date().toISOString().slice(0, 10)}.csv`;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csv);

    logger.info({ count: rows.length, period: period || 'all' }, 'Revenue CSV exported');
  } catch (err) {
    logger.error({ err }, 'Failed to export revenue CSV');
    sendError(res, 500, 'Failed to export revenue data');
  }
});

module.exports = router;
