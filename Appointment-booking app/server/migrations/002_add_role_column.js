/**
 * Migration 002: Add role column to users.
 * (In Postgres, the role column was already included in the initial schema
 *  for convenience, but this migration ensures backward compatibility
 *  if the column was added later on an existing database.)
 */
module.exports.up = async ({ db, queryAll, queryOne, run, logger }) => {
  // Check if column already exists (it will in fresh installs, but not in upgrades)
  const exists = await db().query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  `);

  if (exists.rows.length === 0) {
    await db().query(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'`);
    logger.info('002_add_role_column: added role column to users');
  } else {
    logger.info('002_add_role_column: role column already exists, skipping');
  }
};
