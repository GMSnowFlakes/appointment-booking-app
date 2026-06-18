/**
 * Tests for admin notification email functions.
 *
 * Unit tests: Call email module functions directly with sample data,
 * patch console.log to capture dev-mode email output, and verify
 * the email content (recipients, subject lines, key details).
 *
 * Integration tests: Verify the API endpoints return correct responses
 * and that notifications don't break the booking/cancel/reschedule flow.
 */

// Note: This test suite uses db-mock.js (in-memory SQL mock).
// See __tests__/db-mock-aggregation.test.js → "Known mock limitations"
// for a list of unsupported SQL patterns.

const request = require('supertest');
const { seedTestData, authHeader } = require('./helpers');
const { app, initializeDb } = require('../index');
const emailModule = require('../email');

// ─── Helpers ────────────────────────────────────

function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function captureLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await fn();
    return logs;
  } finally {
    console.log = originalLog;
  }
}

async function bookAppointment(token, overrides = {}) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const dateStr = fmtDate(futureDate);

  const res = await request(app)
    .post('/api/appointments')
    .send({
      service_id: overrides.service_id || 1,
      date: overrides.date || dateStr,
      time: overrides.time || '10:00',
      notes: overrides.notes || 'Test appointment',
    })
    .set(authHeader(token));

  return res;
}

// ─── Setup / Teardown ───────────────────────────

let customerToken;

beforeAll(async () => {
  await initializeDb();
  // seedTestData() not needed — initializeDb() already seeds mock data

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer@test.com', password: 'password123' });
  customerToken = login.body.token;
});

afterAll(async () => {
  // No-op: mock cleanup is automatic
});

/**
 * Helper: join captured logs into a single string for checking.
 * This works in both dev mode (multiple console.log lines with
 * box-drawing characters) and production mode (single log line).
 */
function joinedLogs(logs) {
  return logs.join(' ');
}

// ─── Tests ──────────────────────────────────────

describe('Admin Notification Emails', () => {
  // ── Direct function tests ─────────────────────

  describe('Direct function calls', () => {
    it('sendAdminBookingNotification should log to admin with booking details', async () => {
      const logs = await captureLogs(() =>
        emailModule.sendAdminBookingNotification(
          [{ email: 'admin@test.com', name: 'Admin User' }],
          { id: 2, name: 'Test Customer', email: 'customer@test.com' },
          {
            id: 99, service_name: 'Haircut', date: '2026-07-15',
            time: '10:00', service_duration: 30, service_price: 35.00,
            notes: 'Test', created_at: '2026-06-01',
          }
        )
      );

      const allLogs = joinedLogs(logs);
      expect(allLogs).toContain('admin@test.com');
      expect(allLogs).toContain('New Booking');
      expect(allLogs).toContain('Test Customer');
      expect(allLogs).toContain('Haircut');
    });

    it('sendAdminCancellationNotification should log to admin with cancellation details', async () => {
      const logs = await captureLogs(() =>
        emailModule.sendAdminCancellationNotification(
          [{ email: 'admin@test.com', name: 'Admin User' }],
          { id: 2, name: 'Test Customer', email: 'customer@test.com' },
          {
            id: 99, service_name: 'Massage', date: '2026-07-15',
            time: '10:00', service_duration: 60, service_price: 75.00,
            notes: 'Test', created_at: '2026-06-01',
          }
        )
      );

      const allLogs = joinedLogs(logs);
      expect(allLogs).toContain('admin@test.com');
      expect(allLogs).toContain('Cancelled');
      expect(allLogs).toContain('Test Customer');
      expect(allLogs).toContain('Massage');
    });

    it('sendAdminRescheduleNotification should log to admin with old/new comparison', async () => {
      const logs = await captureLogs(() =>
        emailModule.sendAdminRescheduleNotification(
          [{ email: 'admin@test.com', name: 'Admin User' }],
          { id: 2, name: 'Test Customer', email: 'customer@test.com' },
          { date: '2026-07-15', time: '10:00' },
          {
            id: 99, service_name: 'Facial', date: '2026-07-20',
            time: '14:00', service_duration: 45, service_price: 55.00,
            notes: 'Rescheduled', created_at: '2026-06-01',
          }
        )
      );

      const allLogs = joinedLogs(logs);
      expect(allLogs).toContain('admin@test.com');
      expect(allLogs).toContain('Rescheduled');
      expect(allLogs).toContain('Test Customer');
      expect(allLogs).toContain('Facial');
    });

    it('sendCustomerEmails should log to customer with correct details', async () => {
      const logs = await captureLogs(() =>
        emailModule.sendBookingConfirmation(
          { name: 'Test Customer', email: 'customer@test.com' },
          {
            id: 99, service_name: 'Haircut', date: '2026-07-15',
            time: '10:00', service_duration: 30, service_price: 35.00,
            notes: 'Test', created_at: '2026-06-01',
          }
        )
      );

      const allLogs = joinedLogs(logs);
      expect(allLogs).toContain('customer@test.com');
      expect(allLogs).toContain('Confirmed');
      expect(allLogs).toContain('Haircut');
    });
  });

  // ── Integration: API response integrity ───────

  describe('API endpoints with notifications', () => {
    it('booking endpoint returns 201 with appointment data', async () => {
      const res = await bookAppointment(customerToken, {
        time: '09:00',
        notes: 'Integration booking test',
      });

      expect(res.status).toBe(201);
      expect(res.body.appointment).toHaveProperty('id');
      expect(res.body.appointment.status).toBe('confirmed');
      expect(res.body.message).toContain('booked');
    });

    it('cancel endpoint returns 200 with success message', async () => {
      const bookRes = await bookAppointment(customerToken, {
        service_id: 2,
        time: '11:00',
        notes: 'To cancel via integration test',
      });
      const aptId = bookRes.body.appointment.id;

      const res = await request(app)
        .put(`/api/appointments/${aptId}/cancel`)
        .set(authHeader(customerToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled');
    });

    it('reschedule endpoint returns 200 with updated appointment', async () => {
      const bookRes = await bookAppointment(customerToken, {
        time: '14:00',
        notes: 'To reschedule via integration test',
      });
      const aptId = bookRes.body.appointment.id;

      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 14);
      const newDateStr = fmtDate(newDate);

      const res = await request(app)
        .put(`/api/appointments/${aptId}/reschedule`)
        .send({ date: newDateStr, time: '16:00' })
        .set(authHeader(customerToken));

      expect(res.status).toBe(200);
      expect(res.body.appointment.date).toBe(newDateStr);
      expect(res.body.appointment.time).toBe('16:00');
      expect(res.body.appointment.status).toBe('confirmed');
    });
  });

  // ── Edge cases ────────────────────────────────

  describe('Edge cases', () => {
    it('should handle empty admin list gracefully', async () => {
      const result = await emailModule.sendAdminBookingNotification(
        [],
        { id: 2, name: 'Test Customer', email: 'customer@test.com' },
        { id: 99, service_name: 'Haircut', date: '2026-07-15', time: '10:00' }
      );
      expect(result).toEqual({ id: null });
    });

    it('should handle single admin (not array)', async () => {
      const logs = await captureLogs(() =>
        emailModule.sendAdminBookingNotification(
          { email: 'admin@test.com', name: 'Admin User' },
          { id: 2, name: 'Test Customer', email: 'customer@test.com' },
          { id: 99, service_name: 'Haircut', date: '2026-07-15', time: '10:00', service_duration: 30, service_price: 35.00, notes: null, created_at: '2026-06-01' }
        )
      );

      const allLogs = joinedLogs(logs);
      expect(allLogs).toContain('admin@test.com');
      expect(allLogs).toContain('New Booking');
    });

    it('should send to multiple admins', async () => {
      const logs = await captureLogs(() =>
        emailModule.sendAdminBookingNotification(
          [
            { email: 'admin1@test.com', name: 'Admin One' },
            { email: 'admin2@test.com', name: 'Admin Two' },
          ],
          { id: 2, name: 'Test Customer', email: 'customer@test.com' },
          { id: 99, service_name: 'Haircut', date: '2026-07-15', time: '10:00', service_duration: 30, service_price: 35.00, notes: null, created_at: '2026-06-01' }
        )
      );

      const admin1Log = logs.find(l => l.includes('admin1@test.com'));
      const admin2Log = logs.find(l => l.includes('admin2@test.com'));
      expect(admin1Log).toBeTruthy();
      expect(admin2Log).toBeTruthy();
    });
  });
});
