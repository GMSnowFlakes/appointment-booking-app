/**
 * Migration 006: Add email_reminders column to users for opt-in/out of emails.
 */
module.exports.up = async ({ db, queryAll, queryOne, run, logger }) => {
  const exists = await db().query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_reminders'
  `);

  if (exists.rows.length === 0) {
    await db().query(`ALTER TABLE users ADD COLUMN email_reminders INTEGER DEFAULT 1`);
    logger.info('006_add_email_reminders: added email_reminders column to users');
  } else {
    logger.info('006_add_email_reminders: email_reminders column already exists, skipping');
  }
};
