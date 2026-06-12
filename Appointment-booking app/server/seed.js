/**
 * Admin User Seeder
 *
 * Usage:
 *   node seed.js                          # Auto from env vars
 *   node seed.js <email>                  # Promote existing user to admin
 *   node seed.js --list                   # List all users
 *
 * Environment variables:
 *   ADMIN_EMAIL     — Email for auto-created admin
 *   ADMIN_PASSWORD  — Password for auto-created admin
 *   ADMIN_NAME      — Name for auto-created admin (default: "Admin")
 */

const bcrypt = require('bcryptjs');
const { initDatabase, getDb, queryOne, run, closePool } = require('./db');

async function main() {
  const args = process.argv.slice(2);
  await initDatabase();

  if (args.length === 0) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const adminName = process.env.ADMIN_NAME || 'Admin';
      const existing = await queryOne('SELECT * FROM users WHERE email = $1', [adminEmail]);
      if (existing) {
        if (existing.role !== 'admin') {
          await run('UPDATE users SET role = $1 WHERE id = $2', ['admin', existing.id]);
          console.log(`✅ User '${adminEmail}' promoted to admin`);
        } else {
          console.log(`ℹ️  User '${adminEmail}' is already an admin`);
        }
      } else {
        const hashed = bcrypt.hashSync(adminPassword, 10);
        await run(
          `INSERT INTO users (name, email, password, role)
           VALUES ($1, $2, $3, $4)`,
          [adminName, adminEmail, hashed, 'admin']
        );
        console.log(`✅ Admin user created: ${adminName} <${adminEmail}>`);
      }
    } else {
      console.log(`
┌──────────────────────────────────────────────────┐
│           Admin User Seeder                       │
├──────────────────────────────────────────────────┤
│ Usage:                                           │
│   node seed.js <email>          — Promote user   │
│   node seed.js --list           — List all users │
│                                                   │
│ Environment:                                     │
│   ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass>       │
│   ADMIN_NAME="Admin Name" (optional)              │
│   node seed.js                  — Auto from env   │
└──────────────────────────────────────────────────┘
      `);
    }
    await closePool();
    process.exit(0);
  }

  const command = args[0];

  if (command === '--list') {
    const { rows } = await getDb().query(`
      SELECT id, name, email, role, created_at,
             (SELECT COUNT(*)::int FROM appointments WHERE user_id = users.id) as appointment_count
      FROM users ORDER BY created_at DESC
    `);

    if (rows.length === 0) {
      console.log('📭 No users found');
    } else {
      const cols = Object.keys(rows[0]);
      console.log(`\n📋 Users (${rows.length} total):\n`);
      console.log('  ' + cols.join(' | '));
      console.log('  ' + '-'.repeat(cols.join(' | ').length));
      for (const row of rows) {
        console.log('  ' + cols.map(c => row[c]).join(' | '));
      }
      console.log('');
    }
    await closePool();
    process.exit(0);
  }

  // Promote by email
  const email = args[0];
  const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);

  if (!user) {
    console.error(`❌ User with email '${email}' not found`);
    console.log('   Use --list to see all users');
    await closePool();
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`ℹ️  User '${email}' is already an admin`);
  } else {
    await run('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
    console.log(`✅ User '${email}' promoted to admin`);
  }

  await closePool();
  process.exit(0);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
