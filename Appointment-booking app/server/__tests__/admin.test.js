const request = require('supertest');
const { makeTestSchema, seedTestData, authHeader } = require('./helpers');

const testSchema = makeTestSchema();
process.env.PG_SCHEMA = testSchema;
process.env.JWT_SECRET = 'test-secret-key';
delete process.env.RESEND_API_KEY;

delete require.cache[require.resolve('../db')];
delete require.cache[require.resolve('../email')];
delete require.cache[require.resolve('../index')];

const { app, initializeDb } = require('../index');
const { dropSchema, closePool } = require('../db');

let adminToken, customerToken;

beforeAll(async () => {
  await initializeDb();
  await seedTestData();

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });
  adminToken = adminLogin.body.token;

  const customerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer@test.com', password: 'password123' });
  customerToken = customerLogin.body.token;
});

afterAll(async () => {
  await dropSchema(testSchema);
  await closePool();
});

describe('Admin API', () => {
  describe('Access control', () => {
    it('should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/services')
        .set(authHeader(customerToken));

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/admin/services');
      expect(res.status).toBe(401);
    });

    it('should allow admin users', async () => {
      const res = await request(app)
        .get('/api/admin/services')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });

  describe('Services CRUD', () => {
    it('should list all services (including inactive)', async () => {
      const res = await request(app)
        .get('/api/admin/services')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.services.length).toBeGreaterThanOrEqual(3);
    });

    it('should create a new service', async () => {
      const res = await request(app)
        .post('/api/admin/services')
        .set(authHeader(adminToken))
        .send({
          name: 'New Service',
          description: 'Test service',
          duration: 45,
          price: 50.00,
          category: 'Hair',
        });

      expect(res.status).toBe(201);
      expect(res.body.service.name).toBe('New Service');
    });

    it('should reject creating a service without required fields', async () => {
      const res = await request(app)
        .post('/api/admin/services')
        .set(authHeader(adminToken))
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });

    it('should update a service', async () => {
      const res = await request(app)
        .put('/api/admin/services/1')
        .set(authHeader(adminToken))
        .send({ name: 'Updated Haircut', price: 40.00 });

      expect(res.status).toBe(200);
      expect(res.body.service.name).toBe('Updated Haircut');
    });

    it('should soft-delete (deactivate) a service', async () => {
      const res = await request(app)
        .delete('/api/admin/services/1')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deactivated');
    });

    it('should restore a deactivated service', async () => {
      const res = await request(app)
        .post('/api/admin/services/1/restore')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reactivated');
    });
  });

  describe('Appointments Management', () => {
    it('should list all appointments with user info', async () => {
      const res = await request(app)
        .get('/api/admin/appointments')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.appointments.length).toBeGreaterThanOrEqual(3);
      expect(res.body.appointments[0]).toHaveProperty('user_name');
      expect(res.body.appointments[0]).toHaveProperty('user_email');
    });

    it('should filter appointments by status', async () => {
      const res = await request(app)
        .get('/api/admin/appointments?status=confirmed')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      res.body.appointments.forEach(a => {
        expect(a.status).toBe('confirmed');
      });
    });

    it('should update appointment status', async () => {
      const res = await request(app)
        .put('/api/admin/appointments/2/status')
        .set(authHeader(adminToken))
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('completed');
    });

    it('should reject invalid status values', async () => {
      const res = await request(app)
        .put('/api/admin/appointments/2/status')
        .set(authHeader(adminToken))
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
    });

    it('should return paginated results', async () => {
      const res = await request(app)
        .get('/api/admin/appointments?page=1&limit=5')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('User Management', () => {
    it('should list all users with appointment counts', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);
      expect(res.body.users[0]).toHaveProperty('appointment_count');
    });

    it('should update user role', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(authHeader(adminToken))
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });

    it('should reject invalid role values', async () => {
      const res = await request(app)
        .put('/api/admin/users/2/role')
        .set(authHeader(adminToken))
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
    });

    it('should prevent removing own admin role', async () => {
      const res = await request(app)
        .put('/api/admin/users/1/role')
        .set(authHeader(adminToken))
        .send({ role: 'customer' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot remove your own');
    });

    it('should delete a user', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Delete Me', email: 'delete@test.com', password: 'password123' });
      const newUserId = registerRes.body.user.id;

      const res = await request(app)
        .delete(`/api/admin/users/${newUserId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    it('should prevent deleting own account', async () => {
      const res = await request(app)
        .delete('/api/admin/users/1')
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot delete your own');
    });
  });
});
