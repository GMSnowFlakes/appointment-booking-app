const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { registerSchema, loginSchema, validate } = require('../validation');
const { ApiError, sendValidationError, sendConflictError, sendError } = require('../errors');
const logger = require('../logger');

const router = express.Router();

// POST /register
router.post('/register', (req, res) => {
  const v = validate(registerSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { name, email, password } = v.data;

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return sendConflictError(res, 'Email already registered');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, 'customer']);

  const token = jwt.sign({ id: result.lastInsertRowid, email, name, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });

  logger.info({ userId: result.lastInsertRowid, email }, 'User registered');

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: result.lastInsertRowid, name, email, role: 'customer' }
  });
});

// POST /login
router.post('/login', (req, res) => {
  const v = validate(loginSchema, req.body);
  if (!v.valid) {
    return sendValidationError(res, v.error);
  }

  const { email } = v.data;

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    logger.warn({ email }, 'Login failed: user not found');
    return sendError(res, new ApiError(401, 'Invalid email or password'));
  }

  const validPassword = bcrypt.compareSync(v.data.password, user.password);
  if (!validPassword) {
    logger.warn({ email }, 'Login failed: wrong password');
    return sendError(res, new ApiError(401, 'Invalid email or password'));
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  logger.info({ userId: user.id, email, role: user.role }, 'User logged in');

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

module.exports = router;
