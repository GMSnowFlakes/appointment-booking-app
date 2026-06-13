/**
 * Referral System Route
 *
 * POST   /api/referrals/generate    Generate a referral link/code
 * GET    /api/referrals/my          User's referrals
 * POST   /api/referrals/claim       Claim referral on registration
 * GET    /api/admin/referrals       Admin: list all referrals
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// ─── Generate a referral code ────────────────────────

router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT id, code FROM referrals WHERE referrer_user_id = $1 LIMIT 1', [req.user.id]);
    if (existing) {
      return res.json({ code: existing.code, referral_url: `${req.protocol}://${req.get('host')}/?ref=${existing.code}` });
    }

    const code = generateReferralCode();
    const result = await run(`
      INSERT INTO referrals (referrer_user_id, referred_email, code, status, reward_type)
      VALUES ($1, $2, $3, 'pending', 'credit')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [req.user.id, 'referral-link', code]);

    if (!result.lastInsertRowid) {
      const existing2 = await queryOne('SELECT code FROM referrals WHERE referrer_user_id = $1 LIMIT 1', [req.user.id]);
      return res.json({ code: existing2.code, referral_url: `${req.protocol}://${req.get('host')}/?ref=${existing2.code}` });
    }

    logger.info({ userId: req.user.id, code }, 'Referral code generated');
    res.json({ code, referral_url: `${req.protocol}://${req.get('host')}/?ref=${code}` });
  } catch (err) {
    logger.error({ err }, 'Failed to generate referral code');
    sendError(res, 500, 'Failed to generate referral code');
  }
});

// ─── User's referrals ────────────────────────────────

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const referrals = await queryAll(`
      SELECT r.*, ru.name as referred_name, ru.email as referred_email
      FROM referrals r
      LEFT JOIN users ru ON r.referred_user_id = ru.id
      WHERE r.referrer_user_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json({ referrals });
  } catch (err) {
    logger.error({ err }, 'Failed to list referrals');
    sendError(res, 500, 'Failed to load referrals');
  }
});

// ─── Claim referral on registration (public) ─────────

router.post('/claim', async (req, res) => {
  try {
    const { code, referred_user_id } = req.body;
    if (!code || !referred_user_id) return sendValidationError(res, 'code and referred_user_id are required');

    const ref = await queryOne(
      "SELECT * FROM referrals WHERE code = $1 AND status = 'pending' AND referred_email != 'referral-link'",
      [code]
    );

    if (!ref) {
      // Check if it's a link-based referral
      const linkRef = await queryOne(
        "SELECT * FROM referrals WHERE code = $1 AND status = 'pending' AND referred_email = 'referral-link'",
        [code]
      );
      if (!linkRef) return sendError(res, 404, 'Invalid or expired referral code');

      // Create a new referral record for this specific user
      await run(`
        INSERT INTO referrals (referrer_user_id, referred_email, referred_user_id, code, status)
        VALUES ($1, $2, $3, $4, 'registered')
      `, [linkRef.referrer_user_id, 'link-' + referred_user_id, referred_user_id, code]);

      logger.info({ referrerId: linkRef.referrer_user_id, newUserId: referred_user_id }, 'Referral claimed via link');
      return res.json({ success: true, message: 'Referral claimed!' });
    }

    await run('UPDATE referrals SET referred_user_id = $1, status = $2 WHERE id = $3', [referred_user_id, 'registered', ref.id]);

    logger.info({ referrerId: ref.referrer_user_id, newUserId: referred_user_id }, 'Referral claimed');
    res.json({ success: true, message: 'Referral claimed!' });
  } catch (err) {
    logger.error({ err }, 'Failed to claim referral');
    sendError(res, 500, 'Failed to claim referral');
  }
});

// ─── Helper: Mark referral as booked and reward ──────

async function markReferralBooked(userId) {
  try {
    const ref = await queryOne(
      "SELECT * FROM referrals WHERE referred_user_id = $1 AND status = 'registered'",
      [userId]
    );
    if (!ref) return;

    const rewardCents = 1000; // $10 credit
    await run('UPDATE referrals SET status = $1, reward_amount_cents = $2, updated_at = NOW() WHERE id = $3', ['rewarded', rewardCents, ref.id]);
    await run(
      'INSERT INTO loyalty_points (user_id, points, lifetime_points) VALUES ($1, $2, $2) ON CONFLICT (user_id) DO UPDATE SET points = loyalty_points.points + $2, lifetime_points = loyalty_points.lifetime_points + $2, updated_at = NOW()',
      [ref.referrer_user_id, 500]
    );
    await run(`
      INSERT INTO loyalty_transactions (user_id, points, type, description, reference_id)
      VALUES ($1, 500, 'earned_referral', 'Referral bonus', $2)
    `, [ref.referrer_user_id, ref.id]);

    logger.info({ referrerId: ref.referrer_user_id, newUserId: userId }, 'Referral bonus awarded');
  } catch (err) {
    logger.error({ err, userId }, 'Failed to mark referral booked');
  }
}

module.exports = { router, markReferralBooked };

// ─── Admin: List all referrals ───────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const referrals = await queryAll(`
    SELECT r.*, referrer.name as referrer_name, referrer.email as referrer_email,
           referred.name as referred_name, referred.email as referred_email
    FROM referrals r
    JOIN users referrer ON r.referrer_user_id = referrer.id
    LEFT JOIN users referred ON r.referred_user_id = referred.id
    ORDER BY r.created_at DESC
  `);
  res.json({ referrals });
});

router.use('/admin', adminRouter);
