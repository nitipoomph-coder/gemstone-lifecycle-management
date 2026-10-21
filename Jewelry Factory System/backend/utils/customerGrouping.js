/**
 * Customer Grouping Configuration and Classification Logic
 * Extracted pure utility functions (Zero-DB, Application-Layer)
 */

const CUSTOMER_GROUP_PREFIXES = {
  N008: ['N008', 'N048', 'N065', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'],
  N044: ['N044'],
  N098: ['N098'],
  N051: ['N051'],
  N083: ['N083', 'N086', 'N087', 'N088', 'N089'],
  MLT: ['U411', 'U412', 'U413', 'U414', 'U415', 'U416', 'U417', 'U418', 'U419', 'U420', 'U421', 'U422', 'U423', 'U424', 'U425', 'U426'],
};

const GROUP_LABELS = {
  N008: 'N008 Group',
  N044: 'N044 Group',
  N098: 'N098 Group',
  N051: 'N051 Group',
  N083: 'N083 Group',
  MLT: 'MLT Group',
  General: 'General',
};

/**
 * Determine which customer group a customer code belongs to.
 * @param {string|null|undefined} custCode
 * @returns {string} Customer group ID ('N008', 'N044', 'N098', 'N051', 'N083', 'MLT', or 'General')
 */
function getCustomerGroupId(custCode) {
  const code = String(custCode || '').toUpperCase().trim();
  for (const [groupId, prefixes] of Object.entries(CUSTOMER_GROUP_PREFIXES)) {
    if (prefixes.some(prefix => code.startsWith(prefix))) {
      return groupId;
    }
  }
  return 'General';
}

module.exports = {
  CUSTOMER_GROUP_PREFIXES,
  GROUP_LABELS,
  getCustomerGroupId,
};
