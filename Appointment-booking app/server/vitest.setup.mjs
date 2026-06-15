/**
 * Vitest setup — required env vars for tests.
 *
 * db.js automatically detects process.env.VITEST (set by vitest itself)
 * and switches to the in-memory mock. No vi.mock() needed.
 */

process.env.JWT_SECRET = 'test-secret-key';
delete process.env.RESEND_API_KEY;
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_SCHEDULER = 'true';
