/**
 * Migration 005: Add reminder_sent column to appointments for reminder tracking.
 */
module.exports.up = async ({ db, queryAll, queryOne, run, logger }) => {
  const exists = await db().query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'reminder_sent'
  `);

  if (exists.rows.length === 0) {
    await db().query(`ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0`);
    logger.info('005_add_reminder_sent: added reminder_sent column to appointments');
  } else {
    logger.info('005_add_reminder_sent: reminder_sent column already exists, skipping');
  }
};
