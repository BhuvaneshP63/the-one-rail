const test = require('node:test');
const assert = require('node:assert/strict');
const { holdSeatBatch } = require('../src/utils/atomicSeatHold');

function createInventory(capacity) {
  const seats = Array.from({ length: capacity }, (_, index) => ({ _id: String(index + 1), seatNumber: index + 1, coach: 'S1', status: 'AVAILABLE' }));
  return {
    seats,
    async findOneAndUpdate(filter, update) {
      const seat = seats.find(item => item.seatNumber === filter.seatNumber && item.status === filter.status);
      if (!seat) return null;
      Object.assign(seat, update.$set);
      return { ...seat };
    },
    async updateMany(filter, update) {
      for (const seat of seats) if (filter._id.$in.includes(seat._id) && seat.holdId === filter.holdId && seat.status === filter.status) {
        Object.assign(seat, update.$set);
        for (const key of Object.keys(update.$unset)) delete seat[key];
      }
    }
  };
}

test('simultaneous requests cannot hold the same seat twice', async () => {
  const inventory = createInventory(1);
  const scope = { train: 'train-1', date: '2030-01-01', seatClass: 'SL', coach: 'S1' };
  const attempts = await Promise.all([
    holdSeatBatch({ inventory, scope, seatNumbers: [1], userId: 'user-a', holdId: 'hold-a', expiresAt: new Date(Date.now() + 1000) }),
    holdSeatBatch({ inventory, scope, seatNumbers: [1], userId: 'user-b', holdId: 'hold-b', expiresAt: new Date(Date.now() + 1000) })
  ]);
  assert.equal(attempts.filter(item => item.success).length, 1);
  assert.equal(inventory.seats[0].status, 'HELD');
  assert.ok(['hold-a', 'hold-b'].includes(inventory.seats[0].holdId));
});

test('failed multi-seat holds roll back seats claimed earlier in the batch', async () => {
  const inventory = createInventory(2);
  inventory.seats[1].status = 'BOOKED';
  const result = await holdSeatBatch({
    inventory, scope: { train: 'train-1', date: '2030-01-01', seatClass: 'SL', coach: 'S1' },
    seatNumbers: [1, 2], userId: 'user-a', holdId: 'hold-a', expiresAt: new Date(Date.now() + 1000)
  });
  assert.equal(result.success, false);
  assert.equal(result.seatNumber, 2);
  assert.equal(inventory.seats[0].status, 'AVAILABLE');
  assert.equal(inventory.seats[0].holdId, undefined);
  assert.equal(inventory.seats[1].status, 'BOOKED');
});
