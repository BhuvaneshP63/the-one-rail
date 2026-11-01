const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_COMPOSITION, berthType, layoutInfo } = require('../src/utils/coachInventory');

test('sleeping classes use the expected berth types', () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => berthType('SL', i + 1)), ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SLB', 'SUB']);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => berthType('2A', i + 1)), ['LB', 'UB', 'LB', 'UB', 'SLB', 'SUB']);
  assert.equal(berthType('3E', 80), 'SUB');
});

test('representative coach capacities remain configurable', () => {
  const capacities = Object.fromEntries(Object.entries(DEFAULT_COMPOSITION).map(([cls, coaches]) => [cls, coaches[0].capacity]));
  assert.deepEqual(capacities, { SL: 72, '3A': 72, '3E': 80, '2A': 54, '1A': 24, CC: 78, '2S': 108 });
});

test('1A layout groups four berth cabins and two berth coupes', () => {
  assert.deepEqual(layoutInfo('1A', {}, 4), { layoutUnit: 'Cabin 1', compartmentType: 'Cabin' });
  assert.deepEqual(layoutInfo('1A', {}, 17), { layoutUnit: 'Coupe 1', compartmentType: 'Coupe' });
  assert.deepEqual(layoutInfo('1A', { compartments: [{ name: 'Custom Coupe', type: 'Coupe', capacity: 2 }] }, 2), { layoutUnit: 'Custom Coupe', compartmentType: 'Coupe' });
});

test('custom first-class compartment arrangements support nonstandard capacities', () => {
  const customCoach = { compartments: [
    { name: 'Family Cabin', type: 'Cabin', capacity: 6 },
    { name: 'Private Coupe', type: 'Coupe', capacity: 2 }
  ] };
  assert.deepEqual(layoutInfo('1A', customCoach, 6), { layoutUnit: 'Family Cabin', compartmentType: 'Cabin' });
  assert.deepEqual(layoutInfo('1A', customCoach, 7), { layoutUnit: 'Private Coupe', compartmentType: 'Coupe' });
  assert.equal(layoutInfo('SL', {}, 9).layoutUnit, 'Bay 2');
});

test('chair car seats have row layout and no berth type', () => {
  assert.equal(layoutInfo('CC', {}, 7).layoutUnit, 'Row 2');
  assert.equal(berthType('CC', 7), 'Window');
});
