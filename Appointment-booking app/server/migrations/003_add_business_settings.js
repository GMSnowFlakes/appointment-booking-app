/**
 * Migration 003: Add business_settings table
 *
 * Stores the business configuration for the general-purpose booking app.
 * Admins can configure business type, name, and customize categories.
 */
module.exports = function up({ run, queryOne, saveDatabase, logger }) {
  run(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL DEFAULT 'My Business',
      business_type TEXT NOT NULL DEFAULT 'salon',
      business_description TEXT DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#e11d48',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Insert default settings row if none exists
  const existing = queryOne('SELECT id FROM business_settings LIMIT 1');
  if (!existing) {
    run(`INSERT INTO business_settings (business_name, business_type) VALUES (?, ?)`,
      ['My Business', 'salon']);
    logger.info('Migration 003: Inserted default business settings');
  }

  // Add category color/icon customization to services table
  try {
    run("ALTER TABLE services ADD COLUMN color TEXT DEFAULT NULL");
    saveDatabase();
  } catch (e) { /* column may already exist */ }

  try {
    run("ALTER TABLE services ADD COLUMN icon TEXT DEFAULT NULL");
    saveDatabase();
  } catch (e) { /* column may already exist */ }

  // Add category_colors JSON column for per-category color customization
  try {
    run("ALTER TABLE business_settings ADD COLUMN category_colors TEXT DEFAULT '{}'");
    saveDatabase();
  } catch (e) { /* column may already exist */ }

  logger.info('Migration 003: Added business settings table and category colors');
};
