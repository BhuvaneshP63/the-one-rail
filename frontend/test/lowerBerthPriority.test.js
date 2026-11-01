import test from 'node:test';
import assert from 'node:assert/strict';
import { getLowerBerthPriority } from '../src/utils/lowerBerthPriority.js';

const coachSeats = [
  { seatNumber: 1, seatType: 'LB' },
  { seatNumber: 2, seatType: 'MB' },
  { seatNumber: 3, seatType: 'LB' }
];

test('keeps aged passengers first and women second even after a male passenger selects a lower berth', () => {
  const passengers = [
    { age: 35, gender: 'Male' },
    { age: 68, gender: 'Male' },
    { age: 29, gender: 'Female' }
  ];
  const result = getLowerBerthPriority({ passengers, selectedSeats: [1, null, null], coachSeats, activePassengerIndex: 1 });
  assert.equal(result.recommendLowerForActive, true);
  assert.match(result.guidance, /Priority 1/);
  assert.match(result.guidance, /Priority 2/);
  assert.match(result.guidance, /male passenger’s selection stays as selected/);
});

test('shows a priority reminder for a male passenger choosing a lower berth even when no other passengers are waiting', () => {
  const result = getLowerBerthPriority({
    passengers: [{ age: 32, gender: 'Male' }], selectedSeats: [1], coachSeats, activePassengerIndex: 0
  });
  assert.deepEqual(result.maleLowerBerthSelections, [{ passengerIndex: 0, seatNumber: 1 }]);
});

test('does not recommend a lower berth to a woman until unassigned aged passengers have selected seats', () => {
  const result = getLowerBerthPriority({
    passengers: [{ age: 70, gender: 'Male' }, { age: 24, gender: 'Female' }],
    selectedSeats: [null, null], coachSeats, activePassengerIndex: 1
  });
  assert.equal(result.recommendLowerForActive, false);
  assert.match(result.guidance, /Priority 1/);
});

test('recommends remaining lower berths to women after aged passengers are assigned', () => {
  const result = getLowerBerthPriority({
    passengers: [{ age: 70, gender: 'Male' }, { age: 24, gender: 'Female' }],
    selectedSeats: [2, null], coachSeats, activePassengerIndex: 1
  });
  assert.equal(result.recommendLowerForActive, true);
  assert.match(result.guidance, /Priority 2/);
});
