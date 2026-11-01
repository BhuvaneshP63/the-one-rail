const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Train = require('../src/models/Train');

function sample(overrides = {}) {
  return new Train({
    trainNumber: '99001', name: 'Sample Coach Validation', source: new mongoose.Types.ObjectId(), destination: new mongoose.Types.ObjectId(),
    classes: ['1A', 'SL'], runsOn: ['Mon'],
    coachComposition: [
      { coachNumber: 'H1', classType: '1A', capacity: 6, compartments: [{ name: 'Cabin 1', type: 'Cabin', capacity: 4 }, { name: 'Coupe 1', type: 'Coupe', capacity: 2 }] },
      { coachNumber: 'S1', classType: 'SL', capacity: 72 }
    ],
    ...overrides
  });
}

test('train accepts configurable coach capacities and matching 1A compartments', async () => {
  await assert.doesNotReject(sample().validate());
});

test('train rejects duplicate coach labels within the same class', async () => {
  const train = sample({ coachComposition: [
    { coachNumber: 'S1', classType: 'SL', capacity: 72 },
    { coachNumber: 'S1', classType: 'SL', capacity: 72 }
  ] });
  await assert.rejects(train.validate(), /unique within a class/);
});

test('train rejects 1A compartment totals that do not match capacity', async () => {
  const train = sample({ coachComposition: [{ coachNumber: 'H1', classType: '1A', capacity: 6, compartments: [{ name: 'Cabin 1', type: 'Cabin', capacity: 4 }] }] });
  await assert.rejects(train.validate(), /must add up to the coach capacity/);
});

test('train rejects a coach class not enabled on the train', async () => {
  const train = sample({ classes: ['SL'], coachComposition: [{ coachNumber: 'A1', classType: '2A', capacity: 54 }] });
  await assert.rejects(train.validate(), /not enabled on this train/);
});
