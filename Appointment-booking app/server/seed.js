/**
 * Admin User Seeder
 *
 * Usage:
 *   node seed.js                          # List usage
 *   node seed.js <email>                  # Promote existing user to admin
 *   node seed.js --create <email> <name>  # Create a new admin user (prompts for password)
 *
 * Environment variables:
 *   ADMIN_EMAIL     — Email for auto-created admin
 *   ADMIN_PASSWORD  — Password for auto-created admin
 *   ADMIN_NAME      — Name for auto-created admin (default: "Admin")
 */

const bcrypt = require('bcryptjs');
const { initDatabase, getDb, queryOne, run, saveDatabase } = require('./db');

async function main() {
  const args = process.argv.slice(2);
  await initDatabase();
  const db = getDb();

  if (args.length === 0) {
    // No args: check env vars, otherwise show usage
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const adminName = process.env.ADMIN_NAME || 'Admin';
      const existing = queryOne('SELECT * FROM users WHERE email = ?', [adminEmail]);
      if (existing) {
        if (existing.role !== 'admin') {
          run('UPDATE users SET role = ? WHERE id = ?', ['admin', existing.id]);
          console.log(`✅ User '${adminEmail}' promoted to admin`);
        } else {
          console.log(`ℹ️  User '${adminEmail}' is already an admin`);
        }
      } else {
        const hashed = bcrypt.hashSync(adminPassword, 10);
        run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          [adminName, adminEmail, hashed, 'admin']);
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
    process.exit(0);
  }

  const command = args[0];

  if (command === '--list') {
    const users = db.exec(`
      SELECT id, name, email, role, created_at,
             (SELECT COUNT(*) FROM appointments WHERE user_id = users.id) as appointment_count
      FROM users ORDER BY created_at DESC
    `);
    const rows = users[0]?.values || [];
    const cols = users[0]?.columns || [];

    if (rows.length === 0) {
      console.log('📭 No users found');
    } else {
      console.log(`\n📋 Users (${rows.length} total):\n`);
      console.log('  ' + cols.join(' | '));
      console.log('  ' + '-'.repeat(cols.join(' | ').length));
      for (const row of rows) {
        console.log('  ' + row.join(' | '));
      }
      console.log('');
    }
    process.exit(0);
  }

  // Promote by email
  const email = args[0];
  const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    console.error(`❌ User with email '${email}' not found`);
    console.log('   Use --list to see all users');
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`ℹ️  User '${email}' is already an admin`);
  } else {
    run('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
    console.log(`✅ User '${email}' promoted to admin`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
