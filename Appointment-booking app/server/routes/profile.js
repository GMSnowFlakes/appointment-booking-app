/**
 * Customer Profile & Booking History Route
 *
 * GET    /api/profile            Get current user's profile + booking history
 * PUT    /api/profile            Update profile info
 * GET    /api/profile/stats      Get booking statistics
 */

const express = require('express');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../logger');
const { sendError } = require('../errors');

const router = express.Router();

// ─── Get Profile + Full Booking History ──────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get/create customer profile
    let profile = await queryOne('SELECT * FROM customer_profiles WHERE user_id = $1', [req.user.id]);
    if (!profile) {
      // Compute stats from existing appointments
      const stats = await queryOne(`
        SELECT COUNT(*)::int as total_visits,
               COALESCE(SUM(s.price_in_cents), 0)::int as total_spent_cents
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.user_id = $1 AND a.status IN ('confirmed', 'completed')
      `, [req.user.id]);

      const result = await run(`
        INSERT INTO customer_profiles (user_id, total_visits, total_spent_cents)
        VALUES ($1, $2, $3) RETURNING id
      `, [req.user.id, stats?.total_visits || 0, stats?.total_spent_cents || 0]);

      profile = await queryOne('SELECT * FROM customer_profiles WHERE id = $1', [result.lastInsertRowid]);
    }

    // Get all appointments with service details
    const appointments = await queryAll(`
      SELECT a.*, s.name as service_name, s.duration, s.price,
             s.category, s.image_url,
             sm.name as staff_name, vm.meeting_url as video_url
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      LEFT JOIN staff_appointments sa ON sa.appointment_id = a.id
      LEFT JOIN staff_members sm ON sa.staff_id = sm.id
      LEFT JOIN video_meetings vm ON vm.appointment_id = a.id
      WHERE a.user_id = $1
      ORDER BY a.date DESC, a.time DESC
    `, [req.user.id]);

    // Get total spent
    const totals = await queryOne(`
      SELECT COUNT(*)::int as total_bookings,
             COALESCE(SUM(s.price_in_cents), 0)::int as total_spent_cents,
             COUNT(*) FILTER (WHERE a.status = 'cancelled')::int as cancelled_count
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.user_id = $1
    `, [req.user.id]);

    // Get favorite service
    const favorite = await queryOne(`
      SELECT s.name, COUNT(*)::int as booking_count
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.user_id = $1 AND a.status != 'cancelled'
      GROUP BY s.name
      ORDER BY booking_count DESC LIMIT 1
    `, [req.user.id]);

    res.json({
      profile: {
        ...profile,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      stats: {
        ...totals,
        favorite_service: favorite?.name || null,
      },
      appointments,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get profile');
    sendError(res, 500, 'Failed to get profile');
  }
});

// ─── Update Profile ──────────────────────────────────

router.put('/', authenticateToken, async (req, res) => {
  try {
    const { phone, birthday, preferred_staff_id } = req.body;

    await run(`
      INSERT INTO customer_profiles (user_id, phone, birthday, preferred_staff_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        phone = COALESCE($2, customer_profiles.phone),
        birthday = COALESCE($3, customer_profiles.birthday),
        preferred_staff_id = COALESCE($4, customer_profiles.preferred_staff_id),
        updated_at = NOW()
    `, [req.user.id, phone || null, birthday || null, preferred_staff_id || null]);

    const profile = await queryOne('SELECT * FROM customer_profiles WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Profile updated', profile });
  } catch (err) {
    logger.error({ err }, 'Failed to update profile');
    sendError(res, 500, 'Failed to update profile');
  }
});

// ─── Booking Stats ──────────────────────────────────

router.get('/stats', authenticateToken, async (req, res) => {
  const stats = await queryAll(`
    SELECT
      DATE_TRUNC('month', created_at)::date as month,
      COUNT(*)::int as bookings,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
      SUM(s.price_in_cents)::int as revenue_cents
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.user_id = $1
    GROUP BY month
    ORDER BY month DESC LIMIT 12
  `, [req.user.id]);

  const categoryBreakdown = await queryAll(`
    SELECT s.category, COUNT(*)::int as count
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.user_id = $1 AND a.status != 'cancelled'
    GROUP BY s.category ORDER BY count DESC
  `, [req.user.id]);

  res.json({ monthly: stats, categories: categoryBreakdown });
});

module.exports = router;
