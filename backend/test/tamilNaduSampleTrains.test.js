const test = require('node:test');
const assert = require('node:assert/strict');
const { stations, definitions } = require('../scripts/seedSampleTrains');

const tamilNaduTrains = definitions.filter(train => /^TN-S\d{2}$/.test(train.trainNumber));

test('Tamil Nadu sample trains have distinct numbers and are explicitly labelled as samples', () => {
  assert.equal(tamilNaduTrains.length, 7);
  assert.equal(new Set(tamilNaduTrains.map(train => train.trainNumber)).size, tamilNaduTrains.length);
  assert.ok(tamilNaduTrains.every(train => train.name.startsWith('Sample ')));
  assert.ok(tamilNaduTrains.every(train => train.runsOn.length > 0));
});

test('Tamil Nadu route stops and coach classes are internally consistent', () => {
  const stationCodes = new Set(stations.map(station => station.code));
  for (const train of tamilNaduTrains) {
    assert.ok(train.codes.every(code => stationCodes.has(code)), `${train.trainNumber} uses a station not in the additive station list`);
    assert.equal(train.stops.length, train.codes.length);
    assert.ok(train.stops.every((stop, index) => stop[0] === train.codes[index] && /^\d{2}:\d{2}$/.test(stop[1]) && /^\d{2}:\d{2}$/.test(stop[2])));
    assert.ok(train.coaches.every(coach => train.classes.includes(coach.classType)));
  }
});
