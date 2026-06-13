/**
 * Gift Cards Route
 *
 * POST   /api/gift-cards/validate   Validate & check balance
 * POST   /api/gift-cards/redeem     Apply gift card to payment
 * POST   /api/gift-cards/purchase   Purchase a gift card
 * GET    /api/gift-cards/my         User's purchased gift cards
 * GET    /api/admin/gift-cards      Admin: list all
 * POST   /api/admin/gift-cards      Admin: create gift card
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Validate gift card code ─────────────────────────

router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return sendValidationError(res, 'Gift card code is required');

    const gc = await queryOne(
      'SELECT * FROM gift_cards WHERE LOWER(code) = LOWER($1) AND is_active = 1',
      [code.trim()]
    );
    if (!gc) return sendError(res, 404, 'Invalid or inactive gift card code');

    if (gc.expires_at && new Date(gc.expires_at) < new Date()) {
      return sendError(res, 400, 'This gift card has expired');
    }
    if (gc.remaining_balance_cents <= 0) {
      return sendError(res, 400, 'This gift card has no remaining balance');
    }

    res.json({
      valid: true,
      gift_card: {
        id: gc.id,
        code: gc.code,
        recipient_name: gc.recipient_name,
        initial_balance: (gc.initial_balance_cents / 100).toFixed(2),
        remaining_balance: (gc.remaining_balance_cents / 100).toFixed(2),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Gift card validation failed');
    sendError(res, 500, 'Failed to validate gift card');
  }
});

// ─── Redeem (apply) gift card ────────────────────────

router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { code, appointment_id, amount_cents } = req.body;
    if (!code || !appointment_id || !amount_cents) {
      return sendValidationError(res, 'code, appointment_id, and amount_cents are required');
    }

    const gc = await queryOne(
      'SELECT * FROM gift_cards WHERE LOWER(code) = LOWER($1) AND is_active = 1',
      [code.trim()]
    );
    if (!gc) return sendError(res, 404, 'Invalid gift card');
    if (gc.remaining_balance_cents < amount_cents) {
      return sendError(res, 400, `Insufficient balance. Available: $${(gc.remaining_balance_cents / 100).toFixed(2)}`);
    }

    const apt = await queryOne('SELECT id FROM appointments WHERE id = $1 AND user_id = $2', [appointment_id, req.user.id]);
    if (!apt) return sendNotFoundError(res, 'Appointment not found');

    await run('UPDATE gift_cards SET remaining_balance_cents = remaining_balance_cents - $1 WHERE id = $2', [amount_cents, gc.id]);
    await run(`
      INSERT INTO gift_card_redemptions (gift_card_id, appointment_id, amount_cents)
      VALUES ($1, $2, $3)
    `, [gc.id, appointment_id, amount_cents]);

    logger.info({ userId: req.user.id, giftCardId: gc.id, amount: amount_cents }, 'Gift card redeemed');
    res.json({
      success: true,
      amount: (amount_cents / 100).toFixed(2),
      remaining: ((gc.remaining_balance_cents - amount_cents) / 100).toFixed(2),
    });
  } catch (err) {
    logger.error({ err }, 'Gift card redemption failed');
    sendError(res, 500, 'Failed to redeem gift card');
  }
});

// ─── Purchase a gift card ────────────────────────────

router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { recipient_email, recipient_name, amount, message, payment_intent_id } = req.body;
    if (!recipient_email || !amount) {
      return sendValidationError(res, 'recipient_email and amount are required');
    }

    const code = generateCode();
    const cents = Math.round(parseFloat(amount) * 100);

    const result = await run(`
      INSERT INTO gift_cards (code, issuer_user_id, recipient_email, recipient_name, initial_balance_cents, remaining_balance_cents, message)
      VALUES ($1, $2, $3, $4, $5, $5, $6)
      RETURNING id
    `, [code, req.user.id, recipient_email, recipient_name || null, cents, message || null]);

    const gc = await queryOne('SELECT * FROM gift_cards WHERE id = $1', [result.lastInsertRowid]);

    logger.info({ userId: req.user.id, giftCardId: gc?.id }, 'Gift card purchased');
    res.status(201).json({ message: 'Gift card created successfully', gift_card: gc });
  } catch (err) {
    logger.error({ err }, 'Gift card purchase failed');
    sendError(res, 500, 'Failed to create gift card');
  }
});

// ─── User's purchased gift cards ─────────────────────

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const cards = await queryAll(`
      SELECT * FROM gift_cards WHERE issuer_user_id = $1 ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ gift_cards: cards });
  } catch (err) {
    logger.error({ err }, 'Failed to list gift cards');
    sendError(res, 500, 'Failed to load gift cards');
  }
});

// ─── Admin CRUD ──────────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const cards = await queryAll(`
    SELECT gc.*, u.name as issuer_name, u.email as issuer_email
    FROM gift_cards gc
    LEFT JOIN users u ON gc.issuer_user_id = u.id
    ORDER BY gc.created_at DESC
  `);
  res.json({ gift_cards: cards });
});

adminRouter.post('/', async (req, res) => {
  const { recipient_email, recipient_name, amount, message, expires_at } = req.body;
  if (!recipient_email || !amount) {
    return sendValidationError(res, 'recipient_email and amount are required');
  }

  const code = generateCode();
  const cents = Math.round(parseFloat(amount) * 100);
  const result = await run(`
    INSERT INTO gift_cards (code, recipient_email, recipient_name, initial_balance_cents, remaining_balance_cents, message, expires_at)
    VALUES ($1, $2, $3, $4, $4, $5, $6)
    RETURNING id
  `, [code, recipient_email, recipient_name || null, cents, message || null, expires_at || null]);

  const gc = await queryOne('SELECT * FROM gift_cards WHERE id = $1', [result.lastInsertRowid]);
  logger.info({ giftCardId: gc?.id }, 'Admin created gift card');
  res.status(201).json({ message: 'Gift card created', gift_card: gc });
});

router.use('/admin', adminRouter);

module.exports = router;
