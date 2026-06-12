require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { initDatabase, getDb, queryOne, run } = require('./db');
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

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const appointmentsRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors(createCorsOptions()));
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

// Public settings (no rate limit, lightweight)
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database, run migrations, and seed if empty
async function initializeDb() {
  await initDatabase();
  await runMigrations();
  const db = getDb();
  const result = db.exec("SELECT COUNT(*) as count FROM services");
  const serviceCount = result[0]?.values[0]?.[0] ?? 0;
  if (serviceCount === 0) {
    seedData();
  }
}

function seedData() {
  // Create default business settings if none exist
  const existingSettings = queryOne('SELECT id FROM business_settings LIMIT 1');
  if (!existingSettings) {
    run('INSERT INTO business_settings (business_name, business_type) VALUES (?, ?)',
      ['My Business', 'salon']);
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
    run('INSERT INTO services (name, description, duration, price, category) VALUES (?, ?, ?, ?, ?)',
      [s.name, s.description, s.duration, s.price, s.category]);
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
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = { app, initializeDb };
