const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  getDC,
  setDC,
  getConfiguredRequest,
} = require('../services/productionDashboardService');

describe('Production Dashboard Service Characterization Tests', () => {
  describe('In-Memory Detail Cache (getDC / setDC)', () => {
    test('returns null on cache miss', () => {
      assert.strictEqual(getDC('non_existent_key_12345'), null);
    });

    test('stores and retrieves cached data before expiration', () => {
      const sampleData = { test: 123, ok: true };
      setDC('test_cache_key', sampleData);
      const retrieved = getDC('test_cache_key');
      assert.deepStrictEqual(retrieved, sampleData);
    });
  });

  describe('getConfiguredRequest Export Compatibility', () => {
    test('exports getConfiguredRequest function as required by public contract', () => {
      assert.strictEqual(typeof getConfiguredRequest, 'function');
    });
  });
});
