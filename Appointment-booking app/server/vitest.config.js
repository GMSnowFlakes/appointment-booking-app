const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['__tests__/**/*.test.js'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
