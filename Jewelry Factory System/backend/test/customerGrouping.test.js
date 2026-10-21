const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  getCustomerGroupId,
  CUSTOMER_GROUP_PREFIXES,
  GROUP_LABELS,
} = require('../utils/customerGrouping');

describe('Customer Grouping Characterization Tests', () => {
  describe('Standard customer codes', () => {
    test('maps N008 group primary code and aliases', () => {
      assert.strictEqual(getCustomerGroupId('N008'), 'N008');
      assert.strictEqual(getCustomerGroupId('N048'), 'N008');
      assert.strictEqual(getCustomerGroupId('N065'), 'N008');
      assert.strictEqual(getCustomerGroupId('N066'), 'N008');
      assert.strictEqual(getCustomerGroupId('N070'), 'N008');
      assert.strictEqual(getCustomerGroupId('N075'), 'N008');
    });

    test('maps N044 group', () => {
      assert.strictEqual(getCustomerGroupId('N044'), 'N044');
    });

    test('maps N098 group', () => {
      assert.strictEqual(getCustomerGroupId('N098'), 'N098');
    });

    test('maps N051 group', () => {
      assert.strictEqual(getCustomerGroupId('N051'), 'N051');
    });

    test('maps N083 group and sub-codes', () => {
      assert.strictEqual(getCustomerGroupId('N083'), 'N083');
      assert.strictEqual(getCustomerGroupId('N086'), 'N083');
      assert.strictEqual(getCustomerGroupId('N087'), 'N083');
      assert.strictEqual(getCustomerGroupId('N088'), 'N083');
      assert.strictEqual(getCustomerGroupId('N089'), 'N083');
    });

    test('maps MLT group codes (U411 - U426)', () => {
      assert.strictEqual(getCustomerGroupId('U411'), 'MLT');
      assert.strictEqual(getCustomerGroupId('U414'), 'MLT');
      assert.strictEqual(getCustomerGroupId('U420'), 'MLT');
      assert.strictEqual(getCustomerGroupId('U426'), 'MLT');
    });

    test('falls back to General for unmatched customer codes', () => {
      assert.strictEqual(getCustomerGroupId('C001'), 'General');
      assert.strictEqual(getCustomerGroupId('UNKNOWN_CUST'), 'General');
      assert.strictEqual(getCustomerGroupId('9999'), 'General');
    });
  });

  describe('Edge cases and boundary inputs', () => {
    test('handles empty string gracefully', () => {
      assert.strictEqual(getCustomerGroupId(''), 'General');
    });

    test('handles whitespace-only string', () => {
      assert.strictEqual(getCustomerGroupId('   '), 'General');
    });

    test('handles null and undefined', () => {
      assert.strictEqual(getCustomerGroupId(null), 'General');
      assert.strictEqual(getCustomerGroupId(undefined), 'General');
    });

    test('handles lowercase input by normalizing to uppercase', () => {
      assert.strictEqual(getCustomerGroupId('n008'), 'N008');
      assert.strictEqual(getCustomerGroupId('n044'), 'N044');
      assert.strictEqual(getCustomerGroupId('u411'), 'MLT');
    });

    test('handles surrounding whitespace by trimming', () => {
      assert.strictEqual(getCustomerGroupId('  N008  '), 'N008');
      assert.strictEqual(getCustomerGroupId('\tN098\n'), 'N098');
    });

    test('handles extended codes matching prefixes', () => {
      assert.strictEqual(getCustomerGroupId('N008-01'), 'N008');
      assert.strictEqual(getCustomerGroupId('U414_STORE'), 'MLT');
    });

    test('validates group label constants', () => {
      assert.strictEqual(GROUP_LABELS.N008, 'N008 Group');
      assert.strictEqual(GROUP_LABELS.General, 'General');
      assert.strictEqual(Object.keys(CUSTOMER_GROUP_PREFIXES).length, 6);
    });
  });
});
