/**
 * Vitest setup — mocks the database module so tests run without PostgreSQL.
 *
 * This file is loaded before every test file via vitest.config.js setupFiles.
 * It calls vi.mock('../db') which activates the __mocks__/db.js mock globally,
 * ensuring no test file ever connects to a real Postgres instance.
 */

const { vi } = require('vitest');

// Mock the db module — all test files will use the in-memory implementation
vi.mock('../db');

// Set required env vars
process.env.JWT_SECRET = 'test-secret-key';
delete process.env.RESEND_API_KEY;
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_SCHEDULER = 'true';
