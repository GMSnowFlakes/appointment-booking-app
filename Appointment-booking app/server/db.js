/**
 * Database module — PostgreSQL via pg (node-postgres).
 *
 * When VITEST is set, swaps to an in-memory mock so tests run
 * without a real PostgreSQL instance.
 *
 * Provides async query helpers that mirror the original sql.js API
 * so the rest of the app can migrate with minimal changes.
 *
 * Environment variables:
 *   DATABASE_URL  — Postgres connection string (default: local Docker)
 *   PG_SCHEMA     — Optional schema name (used by tests for isolation)
 *   VITEST        — When truthy, uses in-memory tables instead of PG
 */

// Test mode: use in-memory implementation (no PostgreSQL required)
if (process.env.VITEST) {
  const mock = require('./db-mock');
  module.exports = mock;
  return;
}

const { Pool } = require('pg');

let pool = null;

/**
 * Build a connection string from env or use the default for local Docker.
 */
function getDatabaseUrl() {
  return process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/appointmentbook';
}

/**
 * Initialize the database connection pool and run any schema setup.
 */
async function initDatabase() {
  pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // If PG_SCHEMA is set (E2E test isolation), apply search_path to every
  // new connection from the pool so all queries use the test schema.
  if (process.env.PG_SCHEMA) {
    const schema = process.env.PG_SCHEMA;
    // Create the schema first using a dedicated connection
    const setupClient = await pool.connect();
    try {
      await setupClient.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    } finally {
      setupClient.release();
    }
    // Hook into every future connection from the pool
    pool.on('connect', (client) => {
      client.query(`SET search_path TO ${schema}, public`).catch(() => {});
    });
  }

  // Verify the connection works
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  return pool;
}

/**
 * Get the pool (for direct access if needed).
 */
function getDb() {
  return pool;
}

/**
 * Query all rows from the database.
 * @param {string} sql - SQL with $1, $2, ... placeholders
 * @param {any[]} [params] - Query parameters
 * @returns {Promise<object[]>}
 */
async function queryAll(sql, params = []) {
  if (!pool) throw new Error('Database not initialized. Call initDatabase() first.');
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Query a single row from the database.
 * @returns {Promise<object|null>}
 */
async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Run a statement (INSERT / UPDATE / DELETE).
 *
 * For INSERT statements with RETURNING id, the result will contain
 * `lastInsertRowid`. For UPDATE/DELETE, `lastInsertRowid` is null.
 *
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<{ lastInsertRowid: number|null, rowCount: number }>}
 */
async function run(sql, params = []) {
  if (!pool) throw new Error('Database not initialized. Call initDatabase() first.');
  const result = await pool.query(sql, params);
  return {
    lastInsertRowid: result.rows?.[0]?.id ?? null,
    rowCount: result.rowCount,
  };
}

/**
 * Close the connection pool (used in tests / shutdown).
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Drop the current schema (used in test teardown).
 */
async function dropSchema(schema) {
  if (!pool) return;
  if (!schema) return;
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
}

module.exports = {
  initDatabase,
  getDb,
  queryAll,
  queryOne,
  run,
  closePool,
  dropSchema,
};
