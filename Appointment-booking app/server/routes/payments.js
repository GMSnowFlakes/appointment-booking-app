/**
 * Payments Route — Stripe + PayPal integration
 *
 * POST   /api/payments/create-intent     Create a PaymentIntent for an appointment
 * POST   /api/payments/confirm           Confirm payment (for PayPal)
 * POST   /api/payments/refund            Issue refund on cancellation
 * POST   /api/payments/webhook           Stripe webhook receiver
 * GET    /api/payments/intent/:id        Get payment intent status
 */

const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../logger');
const { ApiError, sendError } = require('../errors');

const router = express.Router();

// ─── Stripe SDK (lazy-loaded, only if STRIPE_SECRET_KEY is set) ───
let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// ─── Helpers ─────────────────────────────────────────────

function centsToDollars(cents) {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars) {
  return Math.round(parseFloat(dollars) * 100);
}

// ─── Create Payment Intent ───────────────────────────────

router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { appointment_id, payment_method = 'stripe' } = req.body;

    if (!appointment_id) {
      return sendError(res, 400, 'appointment_id is required');
    }

    // Fetch appointment
    const appointment = await queryOne(`
      SELECT a.*, s.price, s.deposit_required, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [appointment_id, req.user.id]);

    if (!appointment) {
      return sendError(res, 404, 'Appointment not found');
    }

    if (appointment.status === 'cancelled') {
      return sendError(res, 400, 'Cannot process payment for cancelled appointment');
    }

    // Calculate amount
    const servicePriceCents = dollarsToCents(appointment.price);
    const depositAmountCents = appointment.deposit_required || 0;
    const amountToCharge = depositAmountCents > 0 ? depositAmountCents : servicePriceCents;

    if (payment_method === 'stripe') {
      const s = getStripe();
      if (!s) {
        return sendError(res, 503, 'Stripe is not configured. Set STRIPE_SECRET_KEY.');
      }

      // Create Stripe PaymentIntent
      const paymentIntent = await s.paymentIntents.create({
        amount: amountToCharge,
        currency: 'usd',
        metadata: {
          appointment_id: String(appointment.id),
          user_id: String(req.user.id),
          deposit: String(depositAmountCents > 0),
          service_name: appointment.service_name,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Save payment intent record
      const result = await run(`
        INSERT INTO payment_intents (appointment_id, user_id, stripe_pi_id, amount, currency, status, deposit_amount)
        VALUES ($1, $2, $3, $4, 'usd', 'requires_payment_method', $5)
        RETURNING id
      `, [appointment.id, req.user.id, paymentIntent.id, amountToCharge, depositAmountCents]);

      // Update appointment payment status
      await run(`UPDATE appointments SET payment_status = 'requires_payment' WHERE id = $1`, [appointment.id]);

      logger.info({ appointmentId: appointment.id, piId: paymentIntent.id, amount: amountToCharge }, 'PaymentIntent created');

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountToCharge,
        deposit: depositAmountCents > 0,
        amountDue: depositAmountCents > 0 ? servicePriceCents : 0,
      });
    } else {
      // PayPal flow — return order details for client-side PayPal SDK
      res.json({
        amount: amountToCharge,
        deposit: depositAmountCents > 0,
        appointmentId: appointment.id,
        serviceName: appointment.service_name,
        currency: 'usd',
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to create payment intent');
    sendError(res, 500, err.message || 'Failed to create payment intent');
  }
});

// ─── Confirm Payment (for non-Stripe methods) ────────────

router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { appointment_id, payment_method, payment_id, status } = req.body;

    const appointment = await queryOne('SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [appointment_id, req.user.id]);
    if (!appointment) return sendError(res, 404, 'Appointment not found');

    const service = await queryOne('SELECT * FROM services WHERE id = $1', [appointment.service_id]);
    const amount = dollarsToCents(service.price);
    const depositAmount = service.deposit_required || 0;
    const charged = depositAmount > 0 ? depositAmount : amount;

    // Save payment record
    const piResult = await run(`
      INSERT INTO payment_intents (appointment_id, user_id, paypal_order_id, amount, currency, status, deposit_amount)
      VALUES ($1, $2, $3, $4, 'usd', $5, $6)
      RETURNING id
    `, [appointment.id, req.user.id, payment_id, charged, status || 'succeeded', depositAmount]);

    const newPaymentStatus = depositAmount > 0 ? 'deposit_paid' : 'paid';
    await run(`UPDATE appointments SET payment_status = $1 WHERE id = $2`,
      [newPaymentStatus, appointment.id]);

    logger.info({ appointmentId: appointment.id, method: payment_method, paymentId: payment_id }, 'Payment confirmed');

    res.json({ success: true, paymentId: piResult.lastInsertRowid, paymentStatus: newPaymentStatus });
  } catch (err) {
    logger.error({ err }, 'Payment confirmation failed');
    sendError(res, 500, err.message || 'Payment confirmation failed');
  }
});

// ─── Refund (on cancellation) ────────────────────────────

router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { appointment_id, reason = 'cancellation' } = req.body;

    const appointment = await queryOne('SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [appointment_id, req.user.id]);
    if (!appointment) return sendError(res, 404, 'Appointment not found');

    // Find payment intent
    const pi = await queryOne('SELECT * FROM payment_intents WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1',
      [appointment.id]);
    if (!pi) return sendError(res, 404, 'No payment found for this appointment');

    if (pi.status === 'refunded') return sendError(res, 400, 'Payment already refunded');

    let refundResult = { id: 'manual', status: 'succeeded', amount: pi.amount };

    if (pi.stripe_pi_id && process.env.STRIPE_SECRET_KEY) {
      const s = getStripe();
      if (s) {
        refundResult = await s.refunds.create({
          payment_intent: pi.stripe_pi_id,
          amount: pi.amount,
          metadata: { reason: 'appointment_cancellation' },
        });
      }
    }

    // Record refund
    await run(`
      INSERT INTO refunds (payment_intent_id, stripe_re_id, amount, reason, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [pi.id, refundResult.id, refundResult.amount, reason, refundResult.status]);

    // Update payment intent status
    const newPiStatus = refundResult.amount >= pi.amount ? 'refunded' : 'partially_refunded';
    await run(`UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newPiStatus, pi.id]);

    // Update appointment
    const newPaymentStatus = newPiStatus === 'refunded' ? 'refunded' : 'partially_refunded';
    await run(`UPDATE appointments SET payment_status = $1 WHERE id = $2`,
      [newPaymentStatus, appointment.id]);

    logger.info({ appointmentId: appointment.id, refundAmount: refundResult.amount }, 'Refund processed');

    res.json({
      success: true,
      refundId: refundResult.id,
      amount: refundResult.amount,
      status: refundResult.status,
    });
  } catch (err) {
    logger.error({ err }, 'Refund failed');
    sendError(res, 500, err.message || 'Refund failed');
  }
});

// ─── Stripe Webhook ─────────────────────────────────────
// NOTE: This route must be mounted BEFORE express.json() in index.js
// (or the raw body body-parser middleware must be applied at a higher level)
// See server/index.js for the special mounting setup.

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const s = getStripe();
    if (!s || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).json({ received: true }); // Silently accept if unconfigured
    }
    event = s.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, 'Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await run(`UPDATE payment_intents SET status = 'succeeded', updated_at = NOW() WHERE stripe_pi_id = $1`,
          [pi.id]);

        // Find appointment and update status
        const paymentRecord = await queryOne('SELECT * FROM payment_intents WHERE stripe_pi_id = $1', [pi.id]);
        if (paymentRecord) {
          const newStatus = paymentRecord.deposit_amount > 0 ? 'deposit_paid' : 'paid';
          await run(`UPDATE appointments SET payment_status = $1 WHERE id = $2`,
            [newStatus, paymentRecord.appointment_id]);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await run(`UPDATE payment_intents SET status = 'failed', updated_at = NOW() WHERE stripe_pi_id = $1`,
          [pi.id]);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const pi = await queryOne(`
          UPDATE payment_intents SET status = 'refunded', updated_at = NOW()
          WHERE stripe_pi_id = $1 RETURNING appointment_id
        `, [charge.payment_intent]);
        if (pi) {
          await run(`UPDATE appointments SET payment_status = 'refunded' WHERE id = $1`, [pi.appointment_id]);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Webhook handler failed');
    res.status(200).json({ received: true }); // Acknowledge receipt even on error
  }
});

// ─── Get Payment Intent Status ──────────────────────────

router.get('/intent/:id', authenticateToken, async (req, res) => {
  const pi = await queryOne(`
    SELECT pi.*, a.status as appointment_status, a.payment_status
    FROM payment_intents pi
    JOIN appointments a ON pi.appointment_id = a.id
    WHERE pi.id = $1 AND pi.user_id = $2
  `, [req.params.id, req.user.id]);

  if (!pi) return sendError(res, 404, 'Payment intent not found');
  res.json({ paymentIntent: pi });
});

router.get('/appointment/:appointmentId', authenticateToken, async (req, res) => {
  const pi = await queryOne(`
    SELECT * FROM payment_intents
    WHERE appointment_id = $1 AND user_id = $2
    ORDER BY created_at DESC LIMIT 1
  `, [req.params.appointmentId, req.user.id]);

  res.json({ paymentIntent: pi || null });
});

module.exports = router;
