/**
 * Loyalty Points & Rewards Route
 *
 * GET    /api/loyalty/points         User's loyalty account
 * GET    /api/loyalty/transactions   User's point transactions
 * GET    /api/loyalty/rewards        Available rewards catalog
 * POST   /api/loyalty/redeem         Redeem points for a reward
 * GET    /api/admin/loyalty/settings Admin: tier thresholds
 * GET    /api/admin/loyalty/users    Admin: all users points
 * POST   /api/admin/loyalty/adjust   Admin: adjust points for a user
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── User: Get loyalty account ────────────────────────

router.get('/points', authenticateToken, async (req, res) => {
  try {
    let lp = await queryOne('SELECT * FROM loyalty_points WHERE user_id = $1', [req.user.id]);
    if (!lp) {
      const result = await run(
        'INSERT INTO loyalty_points (user_id, points, lifetime_points) VALUES ($1, 0, 0) RETURNING id',
        [req.user.id]
      );
      lp = await queryOne('SELECT * FROM loyalty_points WHERE id = $1', [result.lastInsertRowid]);
    }
    res.json({ loyalty: lp });
  } catch (err) {
    logger.error({ err }, 'Failed to get loyalty points');
    sendError(res, 500, 'Failed to load loyalty data');
  }
});

// ─── User: Get point transactions ─────────────────────

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await queryAll(`
      SELECT * FROM loyalty_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json({ transactions });
  } catch (err) {
    logger.error({ err }, 'Failed to get loyalty transactions');
    sendError(res, 500, 'Failed to load transactions');
  }
});

// ─── Rewards catalog ──────────────────────────────────

router.get('/rewards', authenticateToken, async (req, res) => {
  try {
    const rewards = await queryAll('SELECT * FROM loyalty_rewards WHERE is_active = 1 ORDER BY points_cost ASC');
    res.json({ rewards });
  } catch (err) {
    logger.error({ err }, 'Failed to list rewards');
    sendError(res, 500, 'Failed to load rewards');
  }
});

// ─── Redeem points for a reward ───────────────────────

router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { reward_id } = req.body;
    if (!reward_id) return sendValidationError(res, 'reward_id is required');

    const reward = await queryOne('SELECT * FROM loyalty_rewards WHERE id = $1 AND is_active = 1', [reward_id]);
    if (!reward) return sendNotFoundError(res, 'Reward not found');

    const lp = await queryOne('SELECT * FROM loyalty_points WHERE user_id = $1', [req.user.id]);
    if (!lp || lp.points < reward.points_cost) {
      return sendError(res, 400, `Not enough points. Need ${reward.points_cost}, have ${lp?.points || 0}`);
    }

    await run('UPDATE loyalty_points SET points = points - $1, updated_at = NOW() WHERE user_id = $2', [reward.points_cost, req.user.id]);
    await run(`
      INSERT INTO loyalty_transactions (user_id, points, type, description)
      VALUES ($1, $2, 'spent_redemption', $3)
    `, [req.user.id, -reward.points_cost, `Redeemed: ${reward.name}`]);

    logger.info({ userId: req.user.id, rewardId: reward_id, points: reward.points_cost }, 'Reward redeemed');
    res.json({ message: `Redeemed ${reward.name} for ${reward.points_cost} points` });
  } catch (err) {
    logger.error({ err }, 'Reward redemption failed');
    sendError(res, 500, 'Failed to redeem reward');
  }
});

// ─── Helper: Award points (called from other routes) ──

async function awardPoints(userId, points, type, description, referenceId) {
  try {
    await run(
      'INSERT INTO loyalty_points (user_id, points, lifetime_points) VALUES ($1, $2, $2) ON CONFLICT (user_id) DO UPDATE SET points = loyalty_points.points + $2, lifetime_points = loyalty_points.lifetime_points + $2, updated_at = NOW()',
      [userId, points]
    );
    await run(`
      INSERT INTO loyalty_transactions (user_id, points, type, description, reference_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, points, type, description, referenceId]);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to award points');
  }
}

module.exports = { router, awardPoints };

// ─── Admin: Points management ─────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const users = await queryAll(`
    SELECT u.id, u.name, u.email, lp.points, lp.lifetime_points, lp.tier
    FROM users u
    LEFT JOIN loyalty_points lp ON u.id = lp.user_id
    ORDER BY lp.points DESC NULLS LAST
  `);
  res.json({ users });
});

adminRouter.post('/adjust', async (req, res) => {
  const { user_id, points, reason } = req.body;
  if (!user_id || points === undefined || !reason) {
    return sendValidationError(res, 'user_id, points, and reason are required');
  }

  await run(
    'INSERT INTO loyalty_points (user_id, points, lifetime_points) VALUES ($1, $2, $2) ON CONFLICT (user_id) DO UPDATE SET points = loyalty_points.points + $2, lifetime_points = GREATEST(loyalty_points.lifetime_points + $2, 0), updated_at = NOW()',
    [user_id, points]
  );
  await run(`
    INSERT INTO loyalty_transactions (user_id, points, type, description)
    VALUES ($1, $2, 'bonus', $3)
  `, [user_id, points, reason]);

  logger.info({ userId: user_id, points, reason }, 'Admin adjusted loyalty points');
  res.json({ message: `Adjusted ${Math.abs(points)} points for user` });
});

router.use('/admin', adminRouter);
