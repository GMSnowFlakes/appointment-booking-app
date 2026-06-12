const request = require('supertest');
const { makeTestSchema } = require('./helpers');

const testSchema = makeTestSchema();
process.env.PG_SCHEMA = testSchema;
process.env.JWT_SECRET = 'test-secret-key';

// Clear db cache and import the app
delete require.cache[require.resolve('../db')];
const { app, initializeDb } = require('../index');
const { dropSchema, closePool } = require('../db');

beforeAll(async () => {
  await initializeDb();
});

afterAll(async () => {
  await dropSchema(testSchema);
  await closePool();
});

describe('Auth API', () => {
  const testUser = {
    name: 'New User',
    email: 'newuser@test.com',
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        name: testUser.name,
        email: testUser.email,
        role: 'customer',
      });
      expect(res.body.user).toHaveProperty('id');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Short', email: 'short@test.com', password: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 6 characters');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bad', email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: testUser.email,
        role: 'customer',
      });
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject empty fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' });

      expect(res.status).toBe(400);
    });
  });
});
