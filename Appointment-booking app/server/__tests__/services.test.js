const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

const testDbPath = path.join(os.tmpdir(), `appointment-test-services-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret-key';

delete require.cache[require.resolve('../db')];
const { app, initializeDb } = require('../index');
const { seedTestData } = require('./helpers');

beforeAll(async () => {
  await initializeDb();
  seedTestData();
});

afterAll(() => {
  try { fs.unlinkSync(testDbPath); } catch (e) { /* ignore */ }
});

describe('Services API', () => {
  describe('GET /api/services', () => {
    it('should return all active services', async () => {
      const res = await request(app).get('/api/services');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('services');
      expect(Array.isArray(res.body.services)).toBe(true);
      expect(res.body.services.length).toBeGreaterThanOrEqual(3);
    });

    it('should return services with correct structure', async () => {
      const res = await request(app).get('/api/services');
      const service = res.body.services[0];

      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('description');
      expect(service).toHaveProperty('duration');
      expect(service).toHaveProperty('price');
      expect(service).toHaveProperty('category');
      expect(service).toHaveProperty('is_active');
    });

    it('should only return active services (is_active = 1)', async () => {
      const res = await request(app).get('/api/services');
      const inactive = res.body.services.filter(s => !s.is_active);
      expect(inactive.length).toBe(0);
    });

    it('should filter by search query (name)', async () => {
      const res = await request(app).get('/api/services?search=hair');

      expect(res.status).toBe(200);
      expect(res.body.services.length).toBeGreaterThanOrEqual(1);
      res.body.services.forEach(s => {
        const match = s.name.toLowerCase().includes('hair') ||
                      (s.description && s.description.toLowerCase().includes('hair'));
        expect(match).toBe(true);
      });
    });

    it('should filter by category', async () => {
      // "Grooming" only has 1 service (from default seed data)
      const res = await request(app).get('/api/services?category=Grooming');

      expect(res.status).toBe(200);
      expect(res.body.services.length).toBe(1);
      expect(res.body.services[0].category).toBe('Grooming');
    });

    it('should return empty array for non-matching search', async () => {
      const res = await request(app).get('/api/services?search=zzzznotfound');

      expect(res.status).toBe(200);
      expect(res.body.services.length).toBe(0);
    });
  });

  describe('GET /api/services/categories', () => {
    it('should return unique categories', async () => {
      const res = await request(app).get('/api/services/categories');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories).toContain('Hair');
      expect(res.body.categories).toContain('Wellness');
    });
  });

  describe('GET /api/services/:id', () => {
    it('should return a specific service', async () => {
      const res = await request(app).get('/api/services/1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service');
      expect(res.body.service.id).toBe(1);
      expect(res.body.service).toHaveProperty('name');
    });

    it('should return 404 for non-existent service', async () => {
      const res = await request(app).get('/api/services/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Service not found');
    });
  });
});
