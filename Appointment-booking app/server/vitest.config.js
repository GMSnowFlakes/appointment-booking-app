const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Run test files sequentially — each creates/drops its own Postgres schema
    sequence: {
      concurrent: false,
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'html'],
    include: ['**/*.js'],
    exclude: [
      'coverage/**',
      'node_modules/**',
      '__tests__/**',
      'migrations/**',
      '*.config.js',
      'seed.js',
    ],
    reportsDirectory: './coverage',
  },
});
