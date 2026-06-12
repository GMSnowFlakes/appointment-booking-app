/**
 * Migration 003: Create business_settings table.
 */
module.exports.up = async ({ db, queryAll, queryOne, run, logger }) => {
  await db().query(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id SERIAL PRIMARY KEY,
      business_name TEXT NOT NULL DEFAULT 'My Business',
      business_type TEXT NOT NULL DEFAULT 'salon',
      business_description TEXT DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#e11d48',
      category_colors TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  logger.info('003_add_business_settings: created business_settings table');
};
