const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    setupFiles: ['./vitest.setup.mjs'],
    testTimeout: 10000,
    hookTimeout: 10000,
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
