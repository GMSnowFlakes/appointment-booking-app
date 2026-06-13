/**
 * Inventory / Products Route
 *
 * GET    /api/inventory                      List active products
 * GET    /api/inventory/service/:serviceId   Products linkable to a service
 * GET    /api/admin/inventory                Admin: all products
 * POST   /api/admin/inventory                Admin: create product
 * PUT    /api/admin/inventory/:id            Admin: update product
 * DELETE /api/admin/inventory/:id            Admin: deactivate product
 * POST   /api/admin/inventory/link           Link product to service
 * DELETE /api/admin/inventory/link           Remove product-service link
 */
const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError, sendNotFoundError } = require('../errors');

const router = express.Router();

// ─── Public: List active products ────────────────────

router.get('/', async (req, res) => {
  try {
    const products = await queryAll(
      'SELECT * FROM products WHERE is_active = 1 AND (stock > 0 OR stock = 0) ORDER BY category, name'
    );
    res.json({ products: products.map(p => ({
      ...p,
      price: (p.price_cents / 100).toFixed(2),
      price_cents: undefined,
      cost_cents: undefined,
    })) });
  } catch (err) {
    logger.error({ err }, 'Failed to list products');
    sendError(res, 500, 'Failed to load products');
  }
});

// ─── Products linkable to a service ─────────────────

router.get('/service/:serviceId', async (req, res) => {
  try {
    const products = await queryAll(`
      SELECT p.*, sp.is_required, sp.quantity_default
      FROM products p
      JOIN service_products sp ON p.id = sp.product_id
      WHERE sp.service_id = $1 AND p.is_active = 1 AND (p.stock > 0 OR p.stock = 0)
      ORDER BY p.name
    `, [req.params.serviceId]);
    res.json({ products: products.map(p => ({ ...p, price: (p.price_cents / 100).toFixed(2) })) });
  } catch (err) {
    logger.error({ err }, 'Failed to list service products');
    sendError(res, 500, 'Failed to load products');
  }
});

// ─── Admin CRUD ──────────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/', async (req, res) => {
  const products = await queryAll('SELECT * FROM products ORDER BY created_at DESC');
  res.json({ products });
});

adminRouter.post('/', async (req, res) => {
  const { name, description, price, cost, stock, sku, category, image_url } = req.body;
  if (!name || price === undefined) return sendValidationError(res, 'name and price are required');

  const result = await run(`
    INSERT INTO products (name, description, price_cents, cost_cents, stock, sku, category, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    name, description || null,
    Math.round(parseFloat(price) * 100),
    cost ? Math.round(parseFloat(cost) * 100) : 0,
    stock ?? 0, sku || null, category || null, image_url || null,
  ]);

  const product = await queryOne('SELECT * FROM products WHERE id = $1', [result.lastInsertRowid]);
  logger.info({ productId: product?.id, name }, 'Admin created product');
  res.status(201).json({ message: 'Product created', product });
});

adminRouter.put('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Product not found');

  const fields = ['name', 'description', 'stock', 'sku', 'category', 'image_url', 'is_active'];
  const updates = [];
  const params = [];
  let idx = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++; }
  }
  if (req.body.price !== undefined) { updates.push(`price_cents = $${idx}`); params.push(Math.round(parseFloat(req.body.price) * 100)); idx++; }
  if (req.body.cost !== undefined) { updates.push(`cost_cents = $${idx}`); params.push(Math.round(parseFloat(req.body.cost) * 100)); idx++; }

  if (updates.length === 0) return sendValidationError(res, 'No fields to update');
  params.push(req.params.id);
  await run(`UPDATE products SET ${updates.join(', ')} WHERE id = $${idx}`, params);

  const product = await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
  res.json({ message: 'Product updated', product });
});

adminRouter.delete('/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!existing) return sendNotFoundError(res, 'Product not found');
  await run('UPDATE products SET is_active = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Product deactivated' });
});

// ─── Link / unlink product to service ────────────────

adminRouter.post('/link', async (req, res) => {
  const { service_id, product_id, is_required, quantity_default } = req.body;
  if (!service_id || !product_id) return sendValidationError(res, 'service_id and product_id are required');

  const existing = await queryOne(
    'SELECT * FROM service_products WHERE service_id = $1 AND product_id = $2',
    [service_id, product_id]
  );
  if (existing) return sendError(res, 400, 'Product already linked to this service');

  await run(`
    INSERT INTO service_products (service_id, product_id, is_required, quantity_default)
    VALUES ($1, $2, $3, $4)
  `, [service_id, product_id, is_required ? 1 : 0, quantity_default ?? 1]);

  logger.info({ serviceId: service_id, productId: product_id }, 'Product linked to service');
  res.status(201).json({ message: 'Product linked to service' });
});

adminRouter.delete('/link', async (req, res) => {
  const { service_id, product_id } = req.body;
  if (!service_id || !product_id) return sendValidationError(res, 'service_id and product_id are required');

  await run('DELETE FROM service_products WHERE service_id = $1 AND product_id = $2', [service_id, product_id]);
  res.json({ message: 'Product unlinked from service' });
});

router.use('/admin', adminRouter);

module.exports = router;
