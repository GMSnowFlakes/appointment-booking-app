const fs = require('fs');
const path = require('path');
const { getDb, queryAll, queryOne, run, saveDatabase } = require('./db');
const logger = require('./logger');

const MIGRATIONS_TABLE = '_migrations';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure the migrations tracking table exists
 */
function ensureMigrationsTable() {
  const db = getDb();
  db.run(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now')),
      checksum TEXT
    )
  `);
  saveDatabase();
}

/**
 * Compute a simple checksum for a migration file to detect tampering
 */
function computeChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Get list of already-applied migration names
 */
function getAppliedMigrations() {
  return queryAll(`SELECT name, checksum FROM ${MIGRATIONS_TABLE} ORDER BY id`);
}

/**
 * Mark a migration as applied
 */
function markApplied(name, checksum) {
  run(`INSERT OR IGNORE INTO ${MIGRATIONS_TABLE} (name, checksum) VALUES (?, ?)`, [name, checksum]);
}

/**
 * Discover migration files on disk, sorted by filename
 */
function discoverMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();  // alphabetical sort ensures 001 before 002 before 003

  return files.map(file => {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      name: file.replace(/\.js$/, ''),
      file,
      fullPath,
      content,
    };
  });
}

/**
 * Run all pending migrations
 * Returns the number of migrations applied.
 */
async function runMigrations() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();
  const appliedNames = new Set(applied.map(m => m.name));
  const pending = discoverMigrations().filter(m => !appliedNames.has(m.name));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return 0;
  }

  let count = 0;
  for (const migration of pending) {
    const checksum = computeChecksum(migration.content);

    // Check if previously applied with different content (tamper detection)
    const existing = applied.find(m => m.name === migration.name);
    if (existing && existing.checksum !== checksum) {
      logger.error({ migration: migration.name }, 'Migration checksum mismatch! File has changed since it was applied.');
      throw new Error(`Migration "${migration.name}" checksum mismatch. The file has changed since it was applied.`);
    }

    logger.info({ migration: migration.name }, 'Running migration...');

    try {
      // Migration modules export an async or sync function that receives helpers
      const mod = require(migration.fullPath);
      const migrateFn = mod.default || mod.up || mod;
      await migrateFn({ db: getDb, queryAll, queryOne, run, saveDatabase, logger });
      markApplied(migration.name, checksum);
      count++;
      logger.info({ migration: migration.name }, 'Migration applied successfully');
    } catch (err) {
      logger.error({ err, migration: migration.name }, 'Migration failed');
      throw err;
    }
  }

  logger.info({ count }, `Applied ${count} migration(s)`);
  return count;
}

/**
 * List migrations and their status
 */
function listMigrations() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();
  const appliedSet = new Map(applied.map(m => [m.name, m]));
  const discovered = discoverMigrations();

  console.log('\n📋 Migrations:\n');
  for (const m of discovered) {
    const status = appliedSet.has(m.name) ? '✅ Applied' : '⏳ Pending';
    console.log(`  ${m.name.padEnd(40)} ${status}`);
  }

  if (discovered.length === 0) {
    console.log('  (no migration files found)');
  }
  console.log('');
}

// ─── CLI ────────────────────────────────
// Run directly: node migrate.js [--list]
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.includes('list')) {
    const { initDatabase } = require('./db');
    initDatabase().then(() => {
      listMigrations();
      process.exit(0);
    }).catch(err => {
      console.error('Failed:', err);
      process.exit(1);
    });
  } else {
    // Run pending migrations
    const { initDatabase } = require('./db');
    initDatabase().then(() => {
      return runMigrations();
    }).then(count => {
      console.log(`✅ ${count} migration(s) applied`);
      process.exit(0);
    }).catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
  }
}

module.exports = { runMigrations, listMigrations };
