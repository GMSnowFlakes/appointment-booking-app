/**
 * Migration 028: Add template support columns to business_settings
 *
 * - recommended_roles: JSON array of recommended staff role titles from templates
 * - disabled_templates: JSON array of business type template IDs that admin disabled
 * - custom_templates: JSON object of admin-created custom templates (keyed by type_id)
 */

module.exports = {
  name: '028_add_business_templates',

  async up(db) {
    try {
      await db.run(`ALTER TABLE business_settings ADD COLUMN recommended_roles TEXT DEFAULT '[]'`);
    } catch (err) {
      if (!err.message?.includes('duplicate column')) throw err;
    }
    try {
      await db.run(`ALTER TABLE business_settings ADD COLUMN disabled_templates TEXT DEFAULT '[]'`);
    } catch (err) {
      if (!err.message?.includes('duplicate column')) throw err;
    }
    try {
      await db.run(`ALTER TABLE business_settings ADD COLUMN custom_templates TEXT DEFAULT '{}'`);
    } catch (err) {
      if (!err.message?.includes('duplicate column')) throw err;
    }
  },

  async down(db) {
    for (const col of ['recommended_roles', 'disabled_templates', 'custom_templates']) {
      try {
        await db.run(`ALTER TABLE business_settings DROP COLUMN ${col}`);
      } catch {}
    }
  },
};
