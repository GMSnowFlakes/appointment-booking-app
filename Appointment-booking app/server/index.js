require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { initDatabase, queryOne, run } = require('./db');
const { createCorsOptions } = require('./cors');
const { runMigrations } = require('./migrate');
const { sendInternalError } = require('./errors');
const logger = require('./logger');
const {
  authLimiter,
  publicLimiter,
  appointmentsLimiter,
  adminLimiter,
  healthLimiter,
} = require('./rate-limit');
const { startScheduler } = require('./scheduler');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const appointmentsRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const preferencesRoutes = require('./routes/preferences');

// New feature routes
const paymentsRoutes = require('./routes/payments');
const couponsRoutes = require('./routes/coupons');
const staffRoutes = require('./routes/staff');
const waitingListRoutes = require('./routes/waiting-list');
const videoRoutes = require('./routes/video');
const calendarSyncRoutes = require('./routes/calendar-sync');
const profileRoutes = require('./routes/profile');
const tenantsRoutes = require('./routes/tenants');
const { router: smsRoutes } = require('./routes/sms');
const analyticsRoutes = require('./routes/analytics');
const packagesRoutes = require('./routes/packages');
const { router: loyaltyRoutes } = require('./routes/loyalty');
const giftCardsRoutes = require('./routes/gift-cards');
const { router: referralsRoutes } = require('./routes/referrals');
const inventoryRoutes = require('./routes/inventory');
const { router: webhooksRoutes } = require('./routes/webhooks');
const widgetRoutes = require('./routes/widget');
const publicBookingRoutes = require('./routes/public-booking');
const icalRoutes = require('./routes/ical');
const financeRoutes = require('./routes/finance');
const staffExtendedRoutes = require('./routes/staff-extended');
const customerManagementRoutes = require('./routes/customer-management');
const notificationsExtendedRoutes = require('./routes/notifications-extended');
const { router: adminExtendedRoutes } = require('./routes/admin-extended');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors(createCorsOptions()));

// Stripe webhook needs raw body BEFORE express.json() consumes it
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      logger.warn({ method: req.method, url: req.originalUrl, statusCode: res.statusCode, duration }, 'Request completed with error');
    } else {
      logger.info({ method: req.method, url: req.originalUrl, statusCode: res.statusCode, duration }, 'Request completed');
    }
  });
  next();
});

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/services', publicLimiter);
app.use('/api/appointments', appointmentsLimiter);
app.use('/api/admin', adminLimiter);
app.get('/api/health', healthLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);

// Public settings
app.use('/api/settings', settingsRoutes);

// User notification preferences
app.use('/api/user/preferences', preferencesRoutes);

// Payment processing (Stripe + PayPal)
// Note: /api/payments/webhook is handled by express.raw() middleware above
app.use('/api/payments', paymentsRoutes);

// Coupons / discount codes
app.use('/api/coupons', couponsRoutes);

// Staff management
app.use('/api/staff', staffRoutes);

// Waiting list
app.use('/api/waiting-list', waitingListRoutes);

// Video conferencing (Zoom / Google Meet)
app.use('/api/video', videoRoutes);

// Google Calendar sync
app.use('/api/calendar', calendarSyncRoutes);

// SMS notifications
app.use('/api/sms', smsRoutes);
app.use('/api/user/sms-preferences', smsRoutes);

// Customer profile & booking history
app.use('/api/profile', profileRoutes);

// Analytics dashboard
app.use('/api/analytics', analyticsRoutes);

// Packages & bundle deals
app.use('/api/packages', packagesRoutes);

// Loyalty points & rewards
app.use('/api/loyalty', loyaltyRoutes);

// Gift cards
app.use('/api/gift-cards', giftCardsRoutes);

// Referral system
app.use('/api/referrals', referralsRoutes);

// Inventory / products
app.use('/api/inventory', inventoryRoutes);

// Outgoing webhooks
app.use('/api/webhooks', webhooksRoutes);

// Embeddable booking widget
app.use('/api/widget', widgetRoutes);

// Public booking pages (embeddable widget + full booking flow)
app.use('/', publicBookingRoutes);

// iCal feed (public token access + user token management)
app.use('/api/ical', icalRoutes);

// Finance enhancements (tax, dynamic pricing, credits, tips)
app.use('/api/finance', financeRoutes);

// Staff extended management (leave, shifts, clock, portfolio)
app.use('/api/staff-extended', staffExtendedRoutes);

// Customer management (blacklist, rules, groups, walk-ins, campaigns)
app.use('/api/customer', customerManagementRoutes);

// Extended notifications (templates, push, in-app messaging, i18n, GDPR)
app.use('/api/notifications', notificationsExtendedRoutes);

// Admin extended (security, audit, API keys, roles, integrations)
app.use('/api/admin-extended', adminExtendedRoutes);

// Multi-tenancy
app.use('/api/tenants', tenantsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database, run migrations, and seed if empty
async function initializeDb() {
  await initDatabase();
  await runMigrations();

  // Check if services exist, seed if empty
  const row = await queryOne('SELECT COUNT(*)::int as count FROM services');
  const serviceCount = parseInt(row?.count ?? 0);
  if (serviceCount === 0) {
    await seedData();
  }

  // Seed default integration settings (safe to call on every startup)
  try {
    const { seedIntegrations } = require('./routes/admin-extended');
    await seedIntegrations();
  } catch (err) {
    logger.error({ err }, 'Failed to seed integrations on startup');
  }
}

async function seedData() {
  // Create default business settings if none exist
  const existing = await queryOne('SELECT id FROM business_settings LIMIT 1');
  if (!existing) {
    await run(
      `INSERT INTO business_settings (business_name, business_type)
       VALUES ($1, $2)`,
      ['My Business', 'salon']
    );
    logger.info('Seeded default business settings');
  }

  // Seed default salon services
  const services = [
    { name: 'Haircut & Styling', description: 'Professional haircut and styling service', duration: 45, price: 45.00, category: 'Hair' },
    { name: 'Beard Trim & Shave', description: 'Precision beard trim with hot towel shave', duration: 30, price: 30.00, category: 'Grooming' },
    { name: 'Hair Coloring', description: 'Full hair coloring with premium products', duration: 90, price: 85.00, category: 'Hair' },
    { name: 'Manicure', description: 'Classic manicure with nail shaping and polish', duration: 45, price: 35.00, category: 'Nails' },
    { name: 'Pedicure', description: 'Relaxing pedicure with foot massage', duration: 60, price: 45.00, category: 'Nails' },
    { name: 'Facial Treatment', description: 'Deep cleansing facial with mask and massage', duration: 60, price: 65.00, category: 'Skincare' },
    { name: 'Massage Therapy', description: 'Full body relaxation massage', duration: 60, price: 75.00, category: 'Wellness' },
    { name: 'Makeup Application', description: 'Professional makeup for any occasion', duration: 60, price: 55.00, category: 'Makeup' }
  ];

  for (const s of services) {
    await run(
      `INSERT INTO services (name, description, duration, price, category)
       VALUES ($1, $2, $3, $4, $5)`,
      [s.name, s.description, s.duration, s.price, s.category]
    );
  }
  logger.info(`Seeded ${services.length} services`);
}

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');
  sendInternalError(res, 'Internal server error');
});

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  initializeDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);

      // Start the reminder email scheduler
      if (process.env.DISABLE_SCHEDULER !== 'true') {
        startScheduler();
      } else {
        console.log('Scheduler disabled via DISABLE_SCHEDULER env var');
      }
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = { app, initializeDb };
