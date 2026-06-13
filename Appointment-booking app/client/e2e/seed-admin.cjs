/**
 * E2E Test Helper: Seed an admin user into the PostgreSQL database.
 *
 * Usage: node seed-admin.cjs <email> <password> <name>
 *
 * This script directly modifies the PostgreSQL database to create an admin user.
 * Uses the DATABASE_URL environment variable (or default local Docker Postgres).
 */

const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.error('Usage: node seed-admin.cjs <email> <password> [name]');
    process.exit(1);
  }

  const { initDatabase, queryOne, run } = require(path.resolve(__dirname, '../../server/db'));

  await initDatabase();

  const hashedPassword = bcrypt.hashSync(password, 10);
  const displayName = name || 'Admin';

  // Check if user already exists
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);

  if (existing) {
    // Update existing user to admin
    await run('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
    console.log(`Updated existing user ${email} to admin`);
  } else {
    // Create new admin user
    await run(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
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
