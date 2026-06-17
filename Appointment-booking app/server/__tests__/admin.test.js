// Note: This test suite uses db-mock.js (in-memory SQL mock).
// See __tests__/db-mock-aggregation.test.js → "Known mock limitations"
// for a list of unsupported SQL patterns.

const request = require('supertest');
const { seedTestData, authHeader } = require('./helpers');
const { app, initializeDb } = require('../index');

let adminToken, customerToken;

beforeAll(async () => {
  await initializeDb();
  // seedTestData() not needed — initializeDb() already seeds mock data

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
  // No-op: mock cleanup is automatic
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

  describe('Business Type Templates (import)', () => {
    let settingsRes;

    beforeAll(async () => {
      // Ensure business_settings row exists before testing import
      settingsRes = await request(app)
        .get('/api/admin/settings')
        .set(authHeader(adminToken));
    });

    it('should list all built-in template types', async () => {
      const res = await request(app)
        .get('/api/admin/templates')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.templates.length).toBeGreaterThan(30);
      const ids = res.body.templates.map(t => t.id);
      expect(ids).toContain('salon');
      expect(ids).toContain('barbershop');
      expect(ids).toContain('massage');
      expect(ids).toContain('custom');
      res.body.templates.forEach(t => {
        expect(t).toHaveProperty('roleCount');
        expect(t).toHaveProperty('serviceCount');
        expect(t).toHaveProperty('custom');
      });
    });

    it('should get template details for a business type', async () => {
      const res = await request(app)
        .get('/api/admin/templates/barbershop')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.template).toHaveProperty('roles');
      expect(res.body.template).toHaveProperty('services');
      expect(res.body.template.roles[0].title).toBe('Barber');
      expect(res.body.template.services.length).toBeGreaterThanOrEqual(6);
      expect(res.body.custom).toBe(false);
    });

    it('should return 401 for unauthorized access', async () => {
      const res = await request(app).get('/api/admin/templates');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin access', async () => {
      const res = await request(app)
        .get('/api/admin/templates')
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    it('should import services and roles from a template', async () => {
      // Count services beforehand
      const beforeRes = await request(app)
        .get('/api/admin/services')
        .set(authHeader(adminToken));
      const beforeCount = beforeRes.body.services.length;

      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({ business_type: 'barbershop', import_roles: true, import_services: true });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Imported \d+ services/);
      expect(res.body.created.services.length).toBeGreaterThan(0);
      expect(res.body.created.roles.length).toBeGreaterThan(0);
      expect(res.body.created.roles[0].title).toBe('Barber');

      // Verify services were actually added
      const afterRes = await request(app)
        .get('/api/admin/services')
        .set(authHeader(adminToken));
      expect(afterRes.body.services.length).toBe(beforeCount + res.body.created.services.length);
    });

    it('should skip duplicate services on re-import', async () => {
      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({ business_type: 'barbershop' });

      expect(res.status).toBe(201);
      expect(res.body.created.services.length).toBe(0);
      expect(res.body.created.roles.length).toBe(0);
    });

    it('should reject missing business_type', async () => {
      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('business_type');
    });

    it('should reject unknown business_type', async () => {
      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({ business_type: 'non-existent-type' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('No template found');
    });

    it('should import services only (skip roles)', async () => {
      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({ business_type: 'massage', import_roles: false, import_services: true });

      expect(res.status).toBe(201);
      expect(res.body.created.services.length).toBeGreaterThan(0);
      expect(res.body.created.roles.length).toBe(0);

      // Names should include massage-specific services
      const names = res.body.created.services.map(s => s.name);
      expect(names).toContain('Swedish Massage');
      expect(names).toContain('Deep Tissue Massage');
    });

    it('should import roles only (skip services)', async () => {
      // Use a type with multiple roles
      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({ business_type: 'salon', import_roles: true, import_services: false });

      expect(res.status).toBe(201);
      expect(res.body.created.services.length).toBe(0);
      expect(res.body.created.roles.length).toBeGreaterThan(0);

      const titles = res.body.created.roles.map(r => r.title);
      expect(titles).toContain('Stylist');
      expect(titles).toContain('Esthetician');
    });

    it('should import the custom business type (empty services)', async () => {
      const res = await request(app)
        .post('/api/admin/templates/import')
        .set(authHeader(adminToken))
        .send({ business_type: 'custom' });

      expect(res.status).toBe(201);
      expect(res.body.created.services.length).toBe(0);
      expect(res.body.created.roles.length).toBeGreaterThan(0);
      expect(res.body.created.roles[0].title).toBe('Business Owner');
    });
  });
});
