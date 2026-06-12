const express = require('express');
const { queryOne, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { notificationPreferencesSchema, validate } = require('../validation');
const { sendValidationError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// GET /api/user/preferences — Get current user's notification preferences
router.get('/', authenticateToken, async (req, res) => {
  const user = await queryOne(
    'SELECT email_reminders FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    preferences: {
      email_reminders: user.email_reminders === 1 || user.email_reminders === null,
      email: req.user.email,
    }
  });
});

// PUT /api/user/preferences — Update notification preferences
router.put('/', authenticateToken, async (req, res) => {
  const v = validate(notificationPreferencesSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { email_reminders } = v.data;

  await run(
    'UPDATE users SET email_reminders = $1 WHERE id = $2',
    [email_reminders ? 1 : 0, req.user.id]
  );

  logger.info({ userId: req.user.id, email_reminders }, 'Notification preferences updated');

  const user = await queryOne(
    'SELECT email_reminders FROM users WHERE id = $1',
    [req.user.id]
  );

  res.json({
    message: 'Preferences updated successfully',
    preferences: {
      email_reminders: user.email_reminders === 1,
      email: req.user.email,
    }
  });
});

module.exports = router;
