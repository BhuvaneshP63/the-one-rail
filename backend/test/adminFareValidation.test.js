const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFareRates } = require('../src/controllers/adminController');

test('accepts supported nonnegative sample fare multipliers', () => {
  assert.doesNotThrow(() => validateFareRates({ SL: 0, '3A': 5.2, CC: 4 }));
  assert.doesNotThrow(() => validateFareRates(undefined));
});

test('rejects malformed, negative, excessive, and unsupported fare multipliers', () => {
  for (const value of [[], { SL: -1 }, { SL: 1001 }, { XXX: 3 }, { '2A': 'not-a-rate' }]) {
    assert.throws(() => validateFareRates(value), { status: 400 });
  }
});
