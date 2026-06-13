/**
 * Analytics dashboard route — revenue, busiest hours, top services, commissions.
 * All endpoints require admin auth (applied by the parent router in index.js).
 */
const express = require('express');
const { queryAll, queryOne } = require('../db');
const { sendError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

/**
 * Compute a date filter SQL snippet + params array based on a period string.
 * Supported periods: 7d, 30d, 90d, 12mo, all
 * Returns { clause, params } — clause includes the leading AND/WHERE keyword.
 */
function dateFilterClause(period) {
  if (!period || period === 'all') return { clause: '', params: [] };
  const days = {
    '7d': 7, '30d': 30, '90d': 90, '12mo': 365,
  };
  const n = days[period];
  if (!n) return { clause: '', params: [] };
  return {
    clause: `AND a.created_at >= NOW() - INTERVAL '${n} days'`,
    params: [],
  };
}

/**
 * GET /analytics/summary
 * Top-level stats: total bookings, revenue, avg per day, active customers
 */
router.get('/summary', async (req, res) => {
  try {
    const { period } = req.query;

    // — Revenue & bookings —
    let whereClause = 'WHERE a.status = \'completed\'';
    const df = dateFilterClause(period);
    const fullWhere = whereClause + df.clause;

    const revenueRow = await queryOne(`
      SELECT
        COUNT(*)::int AS total_bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS total_revenue,
        COALESCE(AVG(s.price)::numeric(10,2), 0) AS avg_booking_value,
        MIN(a.date) AS first_booking_date,
        MAX(a.date) AS last_booking_date
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      ${fullWhere}
    `, df.params);

    // — Total customers —
    const customerRow = await queryOne(`
      SELECT COUNT(DISTINCT a.user_id)::int AS active_customers
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      ${fullWhere}
    `, df.params);

    // — Total registered users —
    const userRow = await queryOne('SELECT COUNT(*)::int AS total_users FROM users');

    // — Cancellations —
    const cancelRow = await queryOne(`
      SELECT COUNT(*)::int AS cancellations
      FROM appointments a
      WHERE a.status = 'cancelled'
      ${df.clause}
    `, df.params);

    // — Avg per day (over the period) —
    let avgPerDay = '—';
    if (revenueRow.first_booking_date && revenueRow.last_booking_date) {
      const daysDiff = Math.max(
        1,
        (new Date(revenueRow.last_booking_date) - new Date(revenueRow.first_booking_date)) / (1000 * 60 * 60 * 24)
      );
      avgPerDay = (revenueRow.total_bookings / daysDiff).toFixed(1);
    }

    // — This month vs last month quick comparison —
    const thisMonth = await queryOne(`
      SELECT
        COUNT(*)::int AS bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completed'
        AND a.created_at >= DATE_TRUNC('month', NOW())
    `);

    const lastMonth = await queryOne(`
      SELECT
        COUNT(*)::int AS bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completed'
        AND a.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND a.created_at < DATE_TRUNC('month', NOW())
    `);

    const calcGrowth = (curr, prev) => prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : null;

    res.json({
      summary: {
        total_bookings: revenueRow.total_bookings,
        total_revenue: parseFloat(revenueRow.total_revenue),
        avg_booking_value: parseFloat(revenueRow.avg_booking_value),
        active_customers: customerRow.active_customers,
        total_users: userRow.total_users,
        cancellations: cancelRow.cancellations,
        avg_bookings_per_day: avgPerDay,
        this_month: {
          bookings: thisMonth.bookings,
          revenue: parseFloat(thisMonth.revenue),
        },
        last_month: {
          bookings: lastMonth.bookings,
          revenue: parseFloat(lastMonth.revenue),
        },
        revenue_growth: calcGrowth(thisMonth.revenue, lastMonth.revenue),
        booking_growth: calcGrowth(thisMonth.bookings, lastMonth.bookings),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Analytics summary error');
    sendError(res, 500, 'Failed to load analytics summary');
  }
});

/**
 * GET /analytics/revenue
 * Daily revenue breakdown for charting.
 */
router.get('/revenue', async (req, res) => {
  try {
    const { period } = req.query;
    const df = dateFilterClause(period);

    const rows = await queryAll(`
      SELECT
        a.date,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'completed' ${df.clause}
      GROUP BY a.date
      ORDER BY a.date ASC
    `, df.params);

    // Also get total so far this month
    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0);

    res.json({
      daily: rows.map(r => ({
        date: r.date,
        bookings: r.bookings,
        revenue: parseFloat(r.revenue),
      })),
      total_revenue: totalRevenue,
    });
  } catch (err) {
    logger.error({ err }, 'Analytics revenue error');
    sendError(res, 500, 'Failed to load revenue data');
  }
});

/**
 * GET /analytics/busiest-hours
 * Most popular booking time slots.
 */
router.get('/busiest-hours', async (req, res) => {
  try {
    const { period } = req.query;
    const df = dateFilterClause(period);

    const rows = await queryAll(`
      SELECT
        a.time,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status != 'cancelled' ${df.clause}
      GROUP BY a.time
      ORDER BY bookings DESC
    `, df.params);

    // Group into hourly buckets for readability
    const hourlyBuckets = {};
    for (const r of rows) {
      const hour = r.time.split(':')[0] + ':00';
      if (!hourlyBuckets[hour]) {
        hourlyBuckets[hour] = { hour, bookings: 0, revenue: 0 };
      }
      hourlyBuckets[hour].bookings += r.bookings;
      hourlyBuckets[hour].revenue += parseFloat(r.revenue);
    }

    const hourly = Object.values(hourlyBuckets).sort((a, b) => {
      return parseInt(a.hour) - parseInt(b.hour);
    });

    const peak = hourly.length > 0
      ? hourly.reduce((max, h) => h.bookings > max.bookings ? h : max)
      : null;

    res.json({ hourly, peak_hour: peak?.hour || '—', peak_bookings: peak?.bookings || 0 });
  } catch (err) {
    logger.error({ err }, 'Analytics busiest-hours error');
    sendError(res, 500, 'Failed to load busiest hours data');
  }
});

/**
 * GET /analytics/top-services
 * Services ranked by booking count and revenue.
 */
router.get('/top-services', async (req, res) => {
  try {
    const { period } = req.query;
    const df = dateFilterClause(period);

    const rows = await queryAll(`
      SELECT
        s.id,
        s.name,
        s.category,
        s.price,
        s.duration,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(s.price)::numeric(10,2), 0) AS revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status != 'cancelled' ${df.clause}
      GROUP BY s.id, s.name, s.category, s.price, s.duration
      ORDER BY bookings DESC
    `, df.params);

    res.json({
      services: rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        price: parseFloat(r.price),
        duration: r.duration,
        bookings: r.bookings,
        revenue: parseFloat(r.revenue),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Analytics top-services error');
    sendError(res, 500, 'Failed to load top services data');
  }
});

/**
 * GET /analytics/commissions
 * Staff commission summaries.
 */
router.get('/commissions', async (req, res) => {
  try {
    const { period } = req.query;
    const df = dateFilterClause(period);
    // For commissions we filter on the commission created_at
    const periodSql = df.clause.replace(/a\./g, 'sc.');

    const rows = await queryAll(`
      SELECT
        sc.staff_id,
        sm.name AS staff_name,
        COUNT(*)::int AS total_appointments,
        COALESCE(SUM(sc.commission_cents)::numeric(10,2), 0) AS total_commission_cents,
        COALESCE(AVG(sc.commission_cents)::numeric(10,2), 0) AS avg_commission_cents,
        COUNT(*) FILTER (WHERE sc.status = 'paid')::int AS paid_count,
        COALESCE(SUM(sc.commission_cents) FILTER (WHERE sc.status = 'paid')::numeric(10,2), 0) AS paid_cents,
        COUNT(*) FILTER (WHERE sc.status = 'pending')::int AS pending_count,
        COALESCE(SUM(sc.commission_cents) FILTER (WHERE sc.status = 'pending')::numeric(10,2), 0) AS pending_cents
      FROM staff_commissions sc
      JOIN staff_members sm ON sc.staff_id = sm.id
      WHERE 1=1 ${periodSql}
      GROUP BY sc.staff_id, sm.name
      ORDER BY total_commission_cents DESC
    `, df.params);

    // Fallback: if no commission data, return empty
    res.json({
      commissions: rows.map(r => ({
        staff_id: r.staff_id,
        staff_name: r.staff_name,
        total_appointments: r.total_appointments,
        total_commission: parseFloat((r.total_commission_cents / 100).toFixed(2)),
        avg_commission: parseFloat((r.avg_commission_cents / 100).toFixed(2)),
        paid: {
          count: r.paid_count,
          amount: parseFloat((r.paid_cents / 100).toFixed(2)),
        },
        pending: {
          count: r.pending_count,
          amount: parseFloat((r.pending_cents / 100).toFixed(2)),
        },
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Analytics commissions error');
    sendError(res, 500, 'Failed to load commission data');
  }
});

module.exports = router;
