const express = require('express');
const { queryAll, queryOne } = require('../db');
const { serviceSearchSchema, validate } = require('../validation');
const { sendNotFoundError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// GET /services — Browse services with optional search & category filter
router.get('/', async (req, res) => {
  const q = validate(serviceSearchSchema, req.query);
  const search = q.valid ? q.data.search || '' : '';
  const category = q.valid ? q.data.category || '' : '';

  let sql = 'SELECT * FROM services WHERE is_active = 1';
  const params = [];

  if (search) {
    sql += ' AND (name ILIKE $1 OR description ILIKE $1)';
    params.push(`%${search}%`);
  }

  if (category) {
    const paramIdx = params.length + 1;
    sql += ` AND category = $${paramIdx}`;
    params.push(category);
  }

  sql += ' ORDER BY category, name';
  const services = await queryAll(sql, params);

  logger.debug({ search, category, count: services.length }, 'Services listed');
  res.json({ services });
});

// GET /services/categories — List all distinct categories
router.get('/categories', async (req, res) => {
  const categories = await queryAll(
    `SELECT DISTINCT category FROM services
     WHERE is_active = 1 AND category IS NOT NULL
     ORDER BY category`
  );
  res.json({ categories: categories.map(c => c.category) });
});

// GET /services/:id
router.get('/:id', async (req, res) => {
  const service = await queryOne(
    'SELECT * FROM services WHERE id = $1 AND is_active = 1',
    [req.params.id]
  );

  if (!service) {
    logger.warn({ serviceId: req.params.id }, 'Service not found');
    return sendNotFoundError(res, 'Service not found');
  }

  res.json({ service });
});

module.exports = router;
