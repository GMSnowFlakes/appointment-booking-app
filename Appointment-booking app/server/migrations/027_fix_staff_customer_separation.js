/**
 * Migration 027: Fix Staff-Customer Data Separation
 *
 * Problem: Staff members created via the admin panel were registered as role='customer'
 * because the old flow used POST /api/auth/register which hardcodes role='customer'.
 * This caused staff to incorrectly appear in the Customer list.
 *
 * Fix: Update users who have entries in staff_members to role='staff'.
 * This ensures proper data separation between Customers (role='customer') and Staff.
 */
module.exports.up = async ({ db, queryAll, queryOne, run, logger }) => {
  // Find all users that are staff members but have role='customer'
  const mixedUsers = await queryAll(`
    SELECT u.id, u.name, u.email, u.role
    FROM users u
    JOIN staff_members sm ON sm.user_id = u.id
    WHERE u.role = 'customer'
  `);

  if (mixedUsers.length === 0) {
    logger.info('027_fix_staff_customer_separation: No mixed records found, skipping');
    return;
  }

  for (const user of mixedUsers) {
    await run('UPDATE users SET role = $1 WHERE id = $2', ['staff', user.id]);
    logger.info({ userId: user.id, email: user.email }, `Updated role from 'customer' to 'staff'`);
  }

  logger.info(`027_fix_staff_customer_separation: Fixed ${mixedUsers.length} mixed records`);
};
