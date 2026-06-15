/**
 * Direct tests for db-mock aggregation code paths.
 *
 * These tests call the mock's queryAll function directly with specific
 * SQL patterns that exercise the COUNT, SUM, COALESCE, COUNT(DISTINCT),
 * and type-casted alias handlers in handleSelect. The analytics route
 * handler uses these patterns but also uses GROUP BY, DATE_TRUNC, INTERVAL,
 * and other unsupported features, so these direct tests provide the coverage.
 */

const { initDatabase, queryAll } = require('../db');

beforeAll(async () => {
  await initDatabase();
});

describe('Mock aggregation code paths', () => {
  describe('COUNT(*)', () => {
    it('should count all rows in a table', async () => {
      const result = await queryAll('SELECT COUNT(*) AS total FROM services');
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(3);
    });

    it('should count rows with a WHERE filter', async () => {
      const result = await queryAll(
        "SELECT COUNT(*) AS total FROM services WHERE category = $1",
        ['Hair']
      );
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(1);
    });

    it('should count with no alias (defaults to "count")', async () => {
      const result = await queryAll(
        "SELECT COUNT(*) FROM appointments WHERE status != 'cancelled'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(3);
    });

    it('should count zero when nothing matches', async () => {
      const result = await queryAll(
        'SELECT COUNT(*) AS total FROM services WHERE category = $1',
        ['NonExistent']
      );
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(0);
    });
  });

  describe('COUNT(DISTINCT)', () => {
    it('should count distinct values in a column', async () => {
      const result = await queryAll(
        'SELECT COUNT(DISTINCT category) AS distinct_categories FROM services'
      );
      expect(result).toHaveLength(1);
      expect(result[0].distinct_categories).toBeGreaterThanOrEqual(3);
    });

    it('should count distinct values with WHERE', async () => {
      const result = await queryAll(
        "SELECT COUNT(DISTINCT user_id) AS distinct_users FROM appointments WHERE status != 'cancelled'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].distinct_users).toBe(2); // user_id 2 and 3 have confirmed appointments
    });
  });

  describe('SUM()', () => {
    it('should sum numeric column values', async () => {
      const result = await queryAll(
        'SELECT SUM(price) AS total_price FROM services'
      );
      expect(result).toHaveLength(1);
      // 35.00 + 75.00 + 55.00 = 165.00
      expect(parseFloat(result[0].total_price)).toBe(165.00);
    });

    it('should sum with WHERE filter', async () => {
      const result = await queryAll(
        "SELECT SUM(duration) AS total FROM services WHERE category = $1",
        ['Hair']
      );
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(30); // Only Haircut (30) is in Hair category
    });

    it('should sum all rows (no WHERE)', async () => {
      const result = await queryAll(
        'SELECT SUM(duration) AS total FROM services'
      );
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(135); // 30 + 60 + 45
    });
  });

  describe('COALESCE()', () => {
    it('should coalesce with fallback on matching rows', async () => {
      const result = await queryAll(
        "SELECT COALESCE(SUM(price), 0) AS total FROM services WHERE category = 'Wellness'"
      );
      expect(result).toHaveLength(1);
      expect(parseFloat(result[0].total)).toBe(75.00);
    });

    it('should fall back to 0 on empty result set', async () => {
      const result = await queryAll(
        "SELECT COALESCE(SUM(price), 0) AS total FROM services WHERE category = 'NonExistent'"
      );
      expect(result).toHaveLength(1);
      expect(parseFloat(result[0].total)).toBe(0);
    });

    it('should coalesce non-SUM column with fallback on matching rows', async () => {
      const result = await queryAll(
        "SELECT COALESCE(price, 0) AS total FROM services WHERE category = 'Hair'"
      );
      expect(result).toHaveLength(1);
      expect(parseFloat(result[0].total)).toBe(35.00);
    });

    it('should coalesce non-SUM column with fallback on empty result set', async () => {
      const result = await queryAll(
        "SELECT COALESCE(price, 0) AS total FROM services WHERE category = 'NonExistent'"
      );
      expect(result).toHaveLength(1);
      expect(parseFloat(result[0].total)).toBe(0);
    });

    it('should coalesce non-SUM column with custom fallback on empty result set', async () => {
      const result = await queryAll(
        "SELECT COALESCE(duration, 99) AS dur FROM services WHERE category = 'NonExistent'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].dur).toBe(99);
    });
  });

  describe('Multiple aggregations in one query', () => {
    it('should return two COALESCE with SUM in one query', async () => {
      const result = await queryAll(
        "SELECT COALESCE(SUM(price), 0) AS total_price, COALESCE(SUM(duration), 0) AS total_dur FROM services"
      );
      expect(result).toHaveLength(1);
      expect(parseFloat(result[0].total_price)).toBe(165.00);
      expect(result[0].total_dur).toBe(135);
    });

    it('should handle mixed COALESCE with SUM and COALESCE without SUM in one query', async () => {
      const result = await queryAll(
        "SELECT COALESCE(SUM(price), 0) AS total_price, COALESCE(duration, 0) AS dur_with_fallback FROM services"
      );
      expect(result).toHaveLength(1);
      expect(parseFloat(result[0].total_price)).toBe(165.00);
      expect(result[0].dur_with_fallback).toBe(135);
    });

    it('should return COUNT and SUM in one query', async () => {
      const result = await queryAll(
        "SELECT COUNT(*) AS cnt, SUM(price) AS total FROM services WHERE is_active = 1"
      );
      expect(result).toHaveLength(1);
      expect(result[0].cnt).toBe(3);
      expect(parseFloat(result[0].total)).toBe(165.00);
    });

    it('should handle COUNT + COALESCE multiple agg in one query', async () => {
      const result = await queryAll(
        "SELECT COUNT(*) AS cnt, COALESCE(SUM(duration), 0) AS total FROM services WHERE category = 'NonExistent'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].cnt).toBe(0);
      expect(result[0].total).toBe(0);
    });
  });

  describe('Corner cases', () => {
    it('should handle COUNT with multiple filters via AND', async () => {
      const result = await queryAll(
        "SELECT COUNT(*) AS cnt FROM appointments WHERE status != 'cancelled' AND date >= '2026-07-01'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].cnt).toBe(3); // 3 non-cancelled appointments after July 1
    });

    it('should handle COUNT with simple WHERE on non-aggregated column', async () => {
      const result = await queryAll(
        "SELECT COUNT(*) FROM services WHERE category = 'Hair'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(1);
    });
  });
});

describe('BETWEEN operator', () => {
  it('should filter by numeric range with BETWEEN', async () => {
    const result = await queryAll(
      'SELECT COUNT(*) AS cnt FROM services WHERE price BETWEEN $1 AND $2',
      [30, 60]
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(2); // Haircut (35) and Facial (55) are in range
  });

  it('should filter by date range with BETWEEN', async () => {
    const result = await queryAll(
      "SELECT COUNT(*) AS cnt FROM appointments WHERE date BETWEEN '2026-07-01' AND '2026-07-31'"
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(3); // 3 appointments in July 2026
  });

  it('should return 0 when BETWEEN matches nothing', async () => {
    const result = await queryAll(
      "SELECT COUNT(*) AS cnt FROM appointments WHERE date BETWEEN '2099-01-01' AND '2099-12-31'"
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(0);
  });

  it('should handle BETWEEN combined with AND', async () => {
    const result = await queryAll(
      "SELECT COUNT(*) AS cnt FROM appointments WHERE date BETWEEN '2026-07-01' AND '2026-07-31' AND status != 'cancelled'"
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(3); // 3 confirmed in July
  });

  it('should handle BETWEEN with both low and high as params', async () => {
    const result = await queryAll(
      'SELECT COUNT(*) AS cnt FROM services WHERE price BETWEEN $1 AND $2',
      [20, 50]
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(1); // Haircut (35) only
  });
});

describe('LEFT JOIN', () => {
  it('should return NULL for right-side columns when no match found', async () => {
    // Admin user (id=1) has no appointments
    const result = await queryAll(
      "SELECT u.name, a.id AS apt_id FROM users u LEFT JOIN appointments a ON a.user_id = u.id WHERE u.role = 'admin'"
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Admin User');
    expect(result[0].apt_id).toBeNull();
  });

  it('should include matched and unmatched rows', async () => {
    // Users 2 and 3 have appointments; user 1 (admin) does not
    const result = await queryAll(
      "SELECT u.id, a.id AS apt_id FROM users u LEFT JOIN appointments a ON a.user_id = u.id ORDER BY u.id"
    );
    // Admin user should have apt_id=null, others should have their appointment IDs
    const adminRow = result.find(r => r.id === 1);
    expect(adminRow.apt_id).toBeNull();
    const customer2 = result.filter(r => r.id === 2);
    expect(customer2.length).toBeGreaterThan(0);
    customer2.forEach(r => expect(r.apt_id).not.toBeNull());
  });

  it('should behave like INNER JOIN for rows with matches', async () => {
    // User 2 has appointments, should still get them
    const result = await queryAll(
      "SELECT u.name, a.id AS apt_id FROM users u LEFT JOIN appointments a ON a.user_id = u.id WHERE u.id = 2"
    );
    expect(result.length).toBeGreaterThan(0);
    result.forEach(r => {
      expect(r.name).toBe('Test Customer');
      expect(r.apt_id).not.toBeNull();
    });
  });

  it('should handle LEFT JOIN on empty join table', async () => {
    // Create a table with no rows
    await queryAll('CREATE TABLE IF NOT EXISTS empty_table (id INT, name TEXT)');
    const result = await queryAll(
      "SELECT u.name, e.id AS eid FROM users u LEFT JOIN empty_table e ON e.id = u.id"
    );
    // All users should be returned with null right-side columns
    expect(result.length).toBe(3);
    result.forEach(r => {
      expect(r.name).toBeTruthy();
      expect(r.eid).toBeNull();
    });
  });

  it('should still work as INNER JOIN for regular JOIN queries', async () => {
    // Regular JOIN should exclude user 1 (no appointments)
    const result = await queryAll(
      "SELECT u.name, a.id AS apt_id FROM users u JOIN appointments a ON a.user_id = u.id ORDER BY u.id"
    );
    // Only users 2 and 3 have appointments
    const adminRow = result.find(r => r.name === 'Admin User');
    expect(adminRow).toBeUndefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Type-casted aliases', () => {
  it('should handle SUM with ::numeric(10,2) type cast', async () => {
    const result = await queryAll(
      'SELECT SUM(price)::numeric(10,2) AS total FROM services'
    );
    expect(result).toHaveLength(1);
    expect(parseFloat(result[0].total)).toBe(165.00);
  });

  it('should handle COUNT with ::int type cast', async () => {
    const result = await queryAll(
      'SELECT COUNT(*)::int AS cnt FROM services'
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(3);
  });

  it('should handle SUM with ::bigint type cast', async () => {
    const result = await queryAll(
      'SELECT COUNT(*)::bigint AS cnt FROM services'
    );
    expect(result).toHaveLength(1);
    expect(result[0].cnt).toBe(3);
  });

  it('should handle type cast with space in parenthesized args', async () => {
    const result = await queryAll(
      'SELECT SUM(duration)::numeric(10, 2) AS total_dur FROM services'
    );
    expect(result).toHaveLength(1);
    expect(result[0].total_dur).toBe(135);
  });

  it('should handle COALESCE with type-cast inside the SUM', async () => {
    const result = await queryAll(
      "SELECT COALESCE(SUM(price)::numeric(10,2), 0) AS tp FROM services WHERE category = 'Wellness'"
    );
    expect(result).toHaveLength(1);
    expect(parseFloat(result[0].tp)).toBe(75.00);
  });

  it('should handle multiple type-cast columns in one query', async () => {
    const result = await queryAll(
      'SELECT SUM(price)::numeric(10,2) AS tp, COUNT(*)::int AS cnt FROM services'
    );
    expect(result).toHaveLength(1);
    expect(parseFloat(result[0].tp)).toBe(165.00);
    expect(result[0].cnt).toBe(3);
  });
});

describe('Known mock limitations', () => {
  // These describe SQL patterns that the mock does not handle correctly.
  // They are documented here as test.todo entries so they appear in test
  // output as pending, making the limitations discoverable.
  //
  // When writing new route handler tests, avoid relying on these patterns.
  // If your SQL uses any of them, consider adding a direct unit test that
  // documents the expected behavior difference vs. real PostgreSQL.

  describe('Silently wrong results', () => {
    test.todo('NULLS FIRST / NULLS LAST in ORDER BY is silently ignored');
    test.todo('ON CONFLICT DO NOTHING without explicit conflict target (e.g. just ON CONFLICT DO NOTHING) — mock cannot infer unique constraints, insert proceeds');
  });

  describe('Throws error or returns undefined', () => {
    test.todo('GREATEST() / LEAST() — throws "Unsupported SQL" or fails to parse');
    test.todo('UNION / UNION ALL — throws "Unsupported SQL" error');
    test.todo('DATE() / DATE_TRUNC() / INTERVAL expressions — return undefined instead of a date value');
    test.todo('GROUP BY with aggregation functions — fails to produce per-group rows');
  });
});
