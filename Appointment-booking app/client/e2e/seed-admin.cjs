/**
 * E2E Test Helper: Seed an admin user into the test database.
 *
 * Usage: node seed-admin.cjs <dbPath> <email> <password> <name>
 *
 * This script directly modifies the SQLite database to create an admin user.
 * It's used by the E2E test suite to set up admin credentials for testing.
 */

const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const [, , dbPath, email, password, name] = process.argv;

  if (!dbPath || !email || !password) {
    console.error('Usage: node seed-admin.cjs <dbPath> <email> <password> [name]');
    process.exit(1);
  }

  // Set environment so db.js picks up the correct path
  process.env.DB_PATH = dbPath;

  const { initDatabase, getDb, run } = require(path.resolve(__dirname, '../../server/db'));

  await initDatabase();

  // Run migrations to ensure tables exist
  const { runMigrations } = require(path.resolve(__dirname, '../../server/migrate'));
  await runMigrations();

  const hashedPassword = bcrypt.hashSync(password, 10);
  const displayName = name || 'Admin';

  // Check if user already exists
  const existing = getDb().exec(
    `SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`
  );

  if (existing[0]?.values?.length > 0) {
    // Update existing user to admin
    run('UPDATE users SET role = ? WHERE email = ?', ['admin', email]);
    console.log(`Updated existing user ${email} to admin`);
  } else {
    // Create new admin user
    run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [displayName, email, hashedPassword, 'admin']
    );
    console.log(`Created admin user: ${displayName} <${email}>`);
  }

  console.log('SEED_ADMIN_COMPLETE');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed admin error:', err);
  process.exit(1);
});
