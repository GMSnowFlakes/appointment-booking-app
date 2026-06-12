/**
 * Migration 002: Add role column to users table
 *
 * This handles existing databases that were created before the role column
 * was added to the schema. Uses try/catch since ALTER TABLE ADD COLUMN
 * will fail if the column already exists.
 */
module.exports = function up({ run, saveDatabase, logger }) {
  try {
    run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
    saveDatabase();
    logger.info('Migration 002: Added role column to users table');
  } catch (e) {
    // Column already exists — ignore
    logger.debug('Migration 002: role column already exists, skipping');
  }
};
