/**
 * Migration 004: Add image_url column to services.
 */
module.exports.up = async ({ db, queryAll, queryOne, run, logger }) => {
  const exists = await db().query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'image_url'
  `);

  if (exists.rows.length === 0) {
    await db().query(`ALTER TABLE services ADD COLUMN image_url TEXT DEFAULT NULL`);
    logger.info('004_add_service_image: added image_url column to services');
  } else {
    logger.info('004_add_service_image: image_url column already exists, skipping');
  }
};
