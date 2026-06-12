const express = require('express');
const { queryOne } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { businessSettingsSchema, validate } = require('../validation');
const { sendValidationError, sendNotFoundError, sendError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// GET /api/settings — Public: get business settings
router.get('/', (req, res) => {
  const settings = queryOne('SELECT * FROM business_settings LIMIT 1');
  if (!settings) {
    return res.json({
      business_name: 'AppointmentBook',
      business_type: 'salon',
      business_description: 'Book your appointments online',
      primary_color: '#e11d48',
    });
  }
  // Parse JSON fields
  if (typeof settings.category_colors === 'string') {
    try { settings.category_colors = JSON.parse(settings.category_colors); } catch { settings.category_colors = {}; }
  }
  res.json({ settings });
});

module.exports = router;
