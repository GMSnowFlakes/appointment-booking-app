/**
 * Coupons / Discount Codes Route
 *
 * POST   /api/coupons/validate   Validate and apply a coupon code
 * POST   /api/coupons/apply      Apply coupon to an appointment
 * POST   /api/coupons/remove     Remove coupon from appointment
 * GET    /api/admin/coupons       Admin: list all coupons
 * POST   /api/admin/coupons      Admin: create coupon
 * PUT    /api/admin/coupons/:id  Admin: update coupon
 * DELETE /api/admin/coupons/:id  Admin: deactivate coupon
 */

const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Public: Validate a coupon code ─────────────────────

router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code, appointment_id } = req.body;
    if (!code) return sendValidationError(res, 'Coupon code is required');

    const coupon = await queryOne(
      'SELECT * FROM coupons WHERE LOWER(code) = LOWER($1) AND is_active = 1',
      [code.trim()]
    );

    if (!coupon) return sendError(res, 404, 'Invalid coupon code');

    // Check expiry
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return sendError(res, 400, 'This coupon is not yet valid');
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return sendError(res, 400, 'This coupon has expired');
    }

    // Check max uses
    if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
      return sendError(res, 400, 'This coupon has reached its usage limit');
    }

    // Check per-user limit
    if (appointment_id) {
      const userUses = await queryOne(
        `SELECT COUNT(*)::int as count FROM appointment_coupons
         WHERE coupon_id = $1 AND user_id = $2`,
        [coupon.id, req.user.id]
      );
      if (coupon.max_uses_per_user > 0 && (userUses?.count || 0) >= coupon.max_uses_per_user) {
        return sendError(res, 400, 'You have already used this coupon the maximum number of times');
      }
    }

    // Calculate discount
    let discountCents = 0;
    if (appointment_id) {
      const appointment = await queryOne(`
        SELECT a.*, s.price, s.price_in_cents
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.id = $1
      `, [appointment_id]);

      if (appointment) {
        const totalCents = appointment.price_in_cents || Math.round(appointment.price * 100);

        if (coupon.min_appointment_amount > 0 && totalCents < coupon.min_appointment_amount) {
          return sendError(res, 400, `Minimum order amount of $${(coupon.min_appointment_amount / 100).toFixed(2)} required`);
        }

        if (coupon.discount_type === 'percentage') {
          discountCents = Math.round(totalCents * (coupon.discount_value / 100));
        } else {
          discountCents = Math.round(coupon.discount_value * 100);
        }

        // Cap discount at appointment total
        discountCents = Math.min(discountCents, totalCents);
      }
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_display: coupon.discount_type === 'percentage'
          ? `${coupon.discount_value}% off`
          : `$${coupon.discount_value.toFixed(2)} off`,
      },
      discount_cents: discountCents,
    });
  } catch (err) {
    logger.error({ err }, 'Coupon validation failed');
    sendError(res, 500, 'Failed to validate coupon');
  }
});

// ─── Apply coupon to appointment ────────────────────────

router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { code, appointment_id } = req.body;
    if (!code || !appointment_id) return sendValidationError(res, 'code and appointment_id are required');

    const coupon = await queryOne(
      'SELECT * FROM coupons WHERE LOWER(code) = LOWER($1) AND is_active = 1',
      [code.trim()]
    );
    if (!coupon) return sendError(res, 404, 'Invalid coupon code');

    // Validate
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return sendError(res, 400, 'Coupon not yet valid');
    if (coupon.valid_until && new Date(coupon.valid_until) < now) return sendError(res, 400, 'Coupon expired');
    if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) return sendError(res, 400, 'Coupon usage limit reached');

    // Check if already applied
    const existing = await queryOne(
      'SELECT * FROM appointment_coupons WHERE appointment_id = $1 AND coupon_id = $2',
      [appointment_id, coupon.id]
    );
    if (existing) return sendError(res, 400, 'Coupon already applied to this appointment');

    // Calculate discount
    const appointment = await queryOne(`
      SELECT a.*, s.price_in_cents
      FROM appointments a JOIN services s ON a.service_id = s.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [appointment_id, req.user.id]);
    if (!appointment) return sendError(res, 404, 'Appointment not found');

    const totalCents = appointment.price_in_cents || Math.round(appointment.price * 100);
    let discountCents = 0;

    if (coupon.discount_type === 'percentage') {
      discountCents = Math.round(totalCents * (coupon.discount_value / 100));
    } else {
      discountCents = Math.round(coupon.discount_value * 100);
    }
    discountCents = Math.min(discountCents, totalCents);

    // Apply coupon
    await run(
      'INSERT INTO appointment_coupons (appointment_id, coupon_id, user_id, discount_amount) VALUES ($1, $2, $3, $4)',
      [appointment_id, coupon.id, req.user.id, discountCents]
    );

    // Increment usage counter
    await run('UPDATE coupons SET current_uses = current_uses + 1 WHERE id = $1', [coupon.id]);

    logger.info({ appointmentId: appointment_id, coupon: coupon.code, discount: discountCents }, 'Coupon applied');

    res.json({
      success: true,
      coupon: { id: coupon.id, code: coupon.code },
      discount_cents: discountCents,
      discount_display: `-$${(discountCents / 100).toFixed(2)}`,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to apply coupon');
    sendError(res, 500, err.message || 'Failed to apply coupon');
  }
});

// ─── Remove coupon from appointment ─────────────────────

router.post('/remove', authenticateToken, async (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) return sendValidationError(res, 'appointment_id is required');

    const ac = await queryOne(`
      DELETE FROM appointment_coupons
      WHERE appointment_id = $1 AND user_id = $2
      RETURNING coupon_id
    `, [appointment_id, req.user.id]);

    if (ac) {
      await run('UPDATE coupons SET current_uses = GREATEST(current_uses - 1, 0) WHERE id = $1', [ac.coupon_id]);
    }

    res.json({ success: true, removed: !!ac });
  } catch (err) {
    logger.error({ err }, 'Failed to remove coupon');
    sendError(res, 500, 'Failed to remove coupon');
  }
});

// ─── Admin: coupon CRUD (mounted at /api/coupons/admin) ──

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const coupons = await queryAll('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons });
});

adminRouter.post('/', async (req, res) => {
  const { code, description, discount_type, discount_value, min_appointment_amount, max_uses, max_uses_per_user, valid_from, valid_until } = req.body;

  if (!code || !discount_type || discount_value === undefined) {
    return sendValidationError(res, 'code, discount_type, and discount_value are required');
  }
  if (!['percentage', 'fixed_amount'].includes(discount_type)) {
    return sendValidationError(res, 'discount_type must be "percentage" or "fixed_amount"');
  }
  if (discount_type === 'percentage' && (discount_value < 1 || discount_value > 100)) {
    return sendValidationError(res, 'Percentage discount must be between 1 and 100');
  }

  const result = await run(`
    INSERT INTO coupons (code, description, discount_type, discount_value, min_appointment_amount, max_uses, max_uses_per_user, valid_from, valid_until)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    code.toUpperCase().replace(/\s+/g, ''),
    description || null,
    discount_type,
    discount_value,
    min_appointment_amount || 0,
    max_uses || 0,
    max_uses_per_user ?? 1,
    valid_from || null,
    valid_until || null,
  ]);

  const coupon = await queryOne('SELECT * FROM coupons WHERE id = $1', [result.lastInsertRowid]);
  logger.info({ couponId: coupon?.id, code: coupon?.code }, 'Admin created coupon');
  res.status(201).json({ message: 'Coupon created successfully', coupon });
});

adminRouter.put('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM coupons WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Coupon not found');

  const { description, discount_type, discount_value, min_appointment_amount, max_uses, max_uses_per_user, is_active, valid_from, valid_until } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (description !== undefined) { updates.push(`description = $${idx}`); params.push(description); idx++; }
  if (discount_type !== undefined) { updates.push(`discount_type = $${idx}`); params.push(discount_type); idx++; }
  if (discount_value !== undefined) { updates.push(`discount_value = $${idx}`); params.push(discount_value); idx++; }
  if (min_appointment_amount !== undefined) { updates.push(`min_appointment_amount = $${idx}`); params.push(min_appointment_amount); idx++; }
  if (max_uses !== undefined) { updates.push(`max_uses = $${idx}`); params.push(max_uses); idx++; }
  if (max_uses_per_user !== undefined) { updates.push(`max_uses_per_user = $${idx}`); params.push(max_uses_per_user); idx++; }
  if (is_active !== undefined) { updates.push(`is_active = $${idx}`); params.push(is_active ? 1 : 0); idx++; }
  if (valid_from !== undefined) { updates.push(`valid_from = $${idx}`); params.push(valid_from); idx++; }
  if (valid_until !== undefined) { updates.push(`valid_until = $${idx}`); params.push(valid_until); idx++; }

  if (updates.length === 0) return sendValidationError(res, 'No fields to update');

  params.push(req.params.id);
  await run(`UPDATE coupons SET ${updates.join(', ')} WHERE id = $${idx}`, params);

  const coupon = await queryOne('SELECT * FROM coupons WHERE id = $1', [req.params.id]);
  res.json({ message: 'Coupon updated successfully', coupon });
});

adminRouter.delete('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM coupons WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Coupon not found');
  await run('UPDATE coupons SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Coupon deactivated successfully' });
});

// Mount admin routes under /admin
router.use('/admin', adminRouter);

module.exports = router;
