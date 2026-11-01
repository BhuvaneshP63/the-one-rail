const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSampleFare } = require('../src/utils/sampleFare');

test('sample fares use the reduced estimate consistently rounded to ₹10', () => {
  assert.equal(calculateSampleFare(495, 2), 500);
  assert.equal(calculateSampleFare(495, 5), 1240);
});

test('short sample trips respect the ₹50 minimum fare', () => {
  assert.equal(calculateSampleFare(10, 1), 50);
});

test('sample fare calculator rejects invalid rates and distances', () => {
  assert.throws(() => calculateSampleFare(-1, 2), /non-negative numbers/);
  assert.throws(() => calculateSampleFare(100, Number.NaN), /non-negative numbers/);
});
