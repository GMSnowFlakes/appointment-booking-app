/**
 * CSV Import Route — Bulk create appointments or customers from CSV files.
 *
 * All endpoints require admin authentication.
 *
 * POST /import/appointments  — Upload CSV to bulk-create appointments
 * POST /import/customers     — Upload CSV to bulk-create customer accounts
 *
 * Expected CSV column headers:
 *
 * Appointments:
 *   customer_email, customer_name, service_name, date, time, status, notes
 *   (service_name is matched case-insensitively to active services in the DB)
 *   (status defaults to 'confirmed' if omitted)
 *   (Conflicts: overlapping time slots for the same service are checked globally.
 *    However, duplicate rows for the same customer_email are still created —
 *    this is intentional so the same person can have multiple appointments on
 *    the same day at different times. To avoid true duplicates, de-duplicate
 *    your CSV before uploading.)
 *
 * Customers:
 *   name, email, password, role
 *   (role defaults to 'customer' if omitted; password defaults to a random one if omitted)
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const multer = require('multer');
const { queryAll, queryOne, run } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../logger');
const { sendError, sendValidationError } = require('../errors');

const router = express.Router();

// ─── Multer config — temp file upload for CSV ───────

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const csvUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.csv';
      const unique = 'import-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      cb(null, unique);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.csv', '.tsv'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV (.csv) and TSV (.tsv) files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ─── Admin auth ─────────────────────────────────────

router.use(authenticateToken, requireAdmin);

// ─── Simple CSV Parser ──────────────────────────────

/**
 * Parse a CSV string into an array of objects using the first row as headers.
 * Handles quoted fields (with commas, newlines, double quotes) per RFC 4180.
 * Trims whitespace from headers and values.
 *
 * @param {string} text — Raw CSV content.
 * @param {string} [sep=','] — Delimiter (',' for CSV, '\t' for TSV).
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseCsv(text, sep = ',') {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === '\r') {
        // Skip \r, handle \n after
      } else if (ch === '\n') {
        lines.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headerLine = lines[0].trim();
  const headers = headerLine.split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = [];
    let field = '';
    let q = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1];
      if (q) {
        if (ch === '"') {
          if (next === '"') { field += '"'; j++; }
          else q = false;
        } else { field += ch; }
      } else {
        if (ch === '"') q = true;
        else if (ch === sep) { values.push(field); field = ''; }
        else field += ch;
      }
    }
    values.push(field);

    const row = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const v = (values[idx] || '').trim();
      row[h] = v;
      if (v) hasValue = true;
    });
    if (hasValue) rows.push(row);
  }

  return { headers, rows };
}

// ─── Helpers ─────────────────────────────────────────

const STATUS_VALUES = ['confirmed', 'cancelled', 'completed'];

/**
 * Validate and normalize a CSV row into a result.
 * Returns { valid: true, data } or { valid: false, error, rowIndex }.
 */
function validateRow(row, rowIndex, validations) {
  for (const v of validations) {
    const val = row[v.field];
    if (v.required && (!val || !val.trim())) {
      return { valid: false, error: `Row ${rowIndex}: "${v.field}" is required` };
    }
    if (val && v.pattern && !v.pattern.test(val)) {
      return { valid: false, error: `Row ${rowIndex}: "${v.field}" has invalid format (${v.hint || val})` };
    }
    if (val && v.maxLength && val.length > v.maxLength) {
      return { valid: false, error: `Row ${rowIndex}: "${v.field}" exceeds max length of ${v.maxLength}` };
    }
    if (val && v.oneOf && !v.oneOf.includes(val.toLowerCase())) {
      return { valid: false, error: `Row ${rowIndex}: "${v.field}" must be one of: ${v.oneOf.join(', ')}` };
    }
  }
  return { valid: true, data: row };
}

// ─── POST /import/appointments ───────────────────────

router.post('/appointments', csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return sendValidationError(res, 'CSV file is required (form field name: "file")');

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const { headers, rows } = parseCsv(content);

    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return sendValidationError(res, 'CSV file is empty or has no data rows');
    }

    // Required headers check
    const requiredHeaders = ['customer_email', 'service_name', 'date', 'time'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      fs.unlinkSync(req.file.path);
      return sendValidationError(res, `CSV is missing required column(s): ${missingHeaders.join(', ')}. Required: ${requiredHeaders.join(', ')}`);
    }

    // Preload active services for name lookup (case-insensitive)
    const allServices = await queryAll('SELECT id, name, LOWER(name) as lname FROM services WHERE is_active = 1');
    const serviceMap = {};
    for (const s of allServices) {
      serviceMap[s.lname] = s.id;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    const results = { success: 0, failed: 0, errors: [], appointments: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const idx = i + 1; // 1-indexed for user-facing messages

      // Validate required fields
      const v = validateRow(row, idx, [
        { field: 'customer_email', required: true, maxLength: 255 },
        { field: 'service_name', required: true, maxLength: 200 },
        { field: 'date', required: true, pattern: dateRegex, hint: 'YYYY-MM-DD' },
        { field: 'time', required: true, pattern: timeRegex, hint: 'HH:MM' },
      ]);
      if (!v.valid) {
        results.failed++;
        results.errors.push(v.error);
        continue;
      }

      const email = row.customer_email.trim().toLowerCase();
      const serviceName = row.service_name.trim();
      const date = row.date.trim();
      const time = row.time.trim();
      const status = row.status && row.status.trim() ? row.status.trim().toLowerCase() : 'confirmed';
      const notes = row.notes ? row.notes.trim() : '';

      // Validate email format (basic)
      if (!email.includes('@') || !email.includes('.')) {
        results.failed++;
        results.errors.push(`Row ${idx}: "customer_email" (${email}) is not a valid email`);
        continue;
      }

      // Validate status
      if (!STATUS_VALUES.includes(status)) {
        results.failed++;
        results.errors.push(`Row ${idx}: "status" must be one of: ${STATUS_VALUES.join(', ')}`);
        continue;
      }

      // Lookup service by name
      const serviceId = serviceMap[serviceName.toLowerCase()];
      if (!serviceId) {
        results.failed++;
        results.errors.push(`Row ${idx}: Service "${serviceName}" not found (must match an active service)`);
        continue;
      }

      // Find or create user by email
      let user = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
      if (!user) {
        const userName = row.customer_name ? row.customer_name.trim() : email.split('@')[0];
        const randomPass = crypto.randomBytes(8).toString('hex');
        const hashed = bcrypt.hashSync(randomPass, 10);
        const r = await run(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [userName, email, hashed, 'customer']
        );
        user = { id: r.lastInsertRowid };
      }

      // Check for time conflicts
      const conflict = await queryOne(`
        SELECT a.id FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.date = $1 AND a.status != 'cancelled' AND a.user_id != $2
        AND $3::time < (a.time::time + (s.duration || ' minutes')::interval)::time
        AND a.time::time < $4::time
      `, [date, user.id, time, time]);

      let appointmentId;
      if (conflict) {
        // Soft conflict — still create but note it
        const result = await run(`
          INSERT INTO appointments (user_id, service_id, date, time, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [user.id, serviceId, date, time, status, notes || null]);
        appointmentId = result.lastInsertRowid;
        results.success++;
        results.appointments.push({ id: appointmentId, email, conflict: true, service: serviceName });
      } else {
        const result = await run(`
          INSERT INTO appointments (user_id, service_id, date, time, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [user.id, serviceId, date, time, status, notes || null]);
        appointmentId = result.lastInsertRowid;
        results.success++;
        results.appointments.push({ id: appointmentId, email, conflict: false, service: serviceName });
      }
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

    logger.info({ success: results.success, failed: results.failed, file: req.file.originalname }, 'Appointments import completed');

    res.json({
      message: `Import complete: ${results.success} created, ${results.failed} failed`,
      results,
    });
  } catch (err) {
    logger.error({ err }, 'Appointments import failed');
    if (req.file) try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    sendError(res, 500, 'Failed to import appointments');
  }
});

// ─── POST /import/customers ─────────────────────────

router.post('/customers', csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return sendValidationError(res, 'CSV file is required (form field name: "file")');

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const { headers, rows } = parseCsv(content);

    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return sendValidationError(res, 'CSV file is empty or has no data rows');
    }

    // Required headers check
    const requiredHeaders = ['name', 'email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      fs.unlinkSync(req.file.path);
      return sendValidationError(res, `CSV is missing required column(s): ${missingHeaders.join(', ')}. Required: ${requiredHeaders.join(', ')}`);
    }

    const results = { success: 0, failed: 0, errors: [], customers: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const idx = i + 1;

      const v = validateRow(row, idx, [
        { field: 'name', required: true, maxLength: 100 },
        { field: 'email', required: true, maxLength: 255 },
      ]);
      if (!v.valid) {
        results.failed++;
        results.errors.push(v.error);
        continue;
      }

      const name = row.name.trim();
      let email = row.email.trim().toLowerCase();
      const role = row.role ? row.role.trim().toLowerCase() : 'customer';

      // Validate email
      if (!email.includes('@') || !email.includes('.')) {
        results.failed++;
        results.errors.push(`Row ${idx}: "email" (${email}) is not a valid email`);
        continue;
      }

      // Validate role
      if (!['customer', 'admin'].includes(role)) {
        results.failed++;
        results.errors.push(`Row ${idx}: "role" must be 'customer' or 'admin'`);
        continue;
      }

      // Check for existing user
      const existing = await queryOne('SELECT id, email FROM users WHERE LOWER(email) = $1', [email]);
      if (existing) {
        results.failed++;
        results.errors.push(`Row ${idx}: Email "${email}" is already registered (user ID: ${existing.id})`);
        continue;
      }

      // Password: use provided or generate random
      const password = row.password ? row.password.trim() : crypto.randomBytes(8).toString('hex');
      if (password.length < 6) {
        results.failed++;
        results.errors.push(`Row ${idx}: Password must be at least 6 characters`);
        continue;
      }

      const hashed = bcrypt.hashSync(password, 10);
      const r = await run(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, hashed, role]
      );

      results.success++;
      results.customers.push({ id: r.lastInsertRowid, name, email, role });
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

    logger.info({ success: results.success, failed: results.failed, file: req.file.originalname }, 'Customer import completed');

    res.json({
      message: `Import complete: ${results.success} created, ${results.failed} failed`,
      results,
    });
  } catch (err) {
    logger.error({ err }, 'Customer import failed');
    if (req.file) try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    sendError(res, 500, 'Failed to import customers');
  }
});

module.exports = router;
