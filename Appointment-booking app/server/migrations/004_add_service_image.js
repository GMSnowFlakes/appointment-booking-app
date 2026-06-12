/**
 * Migration 004: Add service image upload support
 *
 * Adds image_url column to services for storing uploaded service images.
 */
module.exports = function up({ run, saveDatabase, logger }) {
  try {
    run("ALTER TABLE services ADD COLUMN image_url TEXT DEFAULT NULL");
    saveDatabase();
    logger.info('Migration 004: Added image_url column to services');
  } catch (e) {
    /* column may already exist */
  }
};
