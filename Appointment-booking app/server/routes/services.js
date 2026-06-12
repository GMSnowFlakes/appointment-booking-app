const express = require('express');
const { queryAll, queryOne } = require('../db');
const { serviceSearchSchema, validate } = require('../validation');
const { sendNotFoundError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// GET /services — Browse services with optional search & category filter
router.get('/', (req, res) => {
  const q = validate(serviceSearchSchema, req.query);
  const search = q.valid ? q.data.search || '' : '';
  const category = q.valid ? q.data.category || '' : '';

  let sql = 'SELECT * FROM services WHERE is_active = 1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY category, name';
  const services = queryAll(sql, params);

  logger.debug({ search, category, count: services.length }, 'Services listed');
  res.json({ services });
});

// GET /services/categories — List all distinct categories
router.get('/categories', (req, res) => {
  const categories = queryAll("SELECT DISTINCT category FROM services WHERE is_active = 1 AND category IS NOT NULL ORDER BY category");
  res.json({ categories: categories.map(c => c.category) });
});

// GET /services/:id
router.get('/:id', (req, res) => {
  const service = queryOne('SELECT * FROM services WHERE id = ? AND is_active = 1', [req.params.id]);

  if (!service) {
    logger.warn({ serviceId: req.params.id }, 'Service not found');
    return sendNotFoundError(res, 'Service not found');
  }

  res.json({ service });
});

module.exports = router;
