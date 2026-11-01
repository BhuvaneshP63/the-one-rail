const SeatInventory = require('../models/SeatInventory');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Schedule = require('../models/Schedule');
const HOLD_MINUTES = Math.max(1, Number(process.env.SEAT_HOLD_MINUTES) || 8);

const DEFAULT_COMPOSITION = {
  SL: [{ coachNumber: 'S1', capacity: 72 }, { coachNumber: 'S2', capacity: 72 }],
  '3A': [{ coachNumber: 'B1', capacity: 72 }, { coachNumber: 'B2', capacity: 72 }],
  '3E': [{ coachNumber: 'M1', capacity: 80 }],
  '2A': [{ coachNumber: 'A1', capacity: 54 }],
  '1A': [{ coachNumber: 'H1', capacity: 24 }],
  CC: [{ coachNumber: 'C1', capacity: 78 }],
  '2S': [{ coachNumber: 'D1', capacity: 108 }]
};

function berthType(cls, number) {
  if (cls === '1A') return number % 4 === 1 || number % 4 === 2 ? 'LB' : 'UB';
  if (cls === '2A') return ['LB', 'UB', 'LB', 'UB', 'SLB', 'SUB'][(number - 1) % 6];
  if (cls === '3A' || cls === '3E' || cls === 'SL') return ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SLB', 'SUB'][(number - 1) % 8];
  return number % 6 === 1 || number % 6 === 0 ? 'Window' : (number % 6 === 2 || number % 6 === 5 ? 'Middle' : 'Aisle');
}

function layoutInfo(cls, coach, number) {
  if (cls === '1A') {
    const units = coach.compartments?.length ? coach.compartments : [
      { name: 'Cabin 1', type: 'Cabin', capacity: 4 }, { name: 'Cabin 2', type: 'Cabin', capacity: 4 },
      { name: 'Cabin 3', type: 'Cabin', capacity: 4 }, { name: 'Cabin 4', type: 'Cabin', capacity: 4 },
      { name: 'Coupe 1', type: 'Coupe', capacity: 2 }, { name: 'Coupe 2', type: 'Coupe', capacity: 2 },
      { name: 'Coupe 3', type: 'Coupe', capacity: 2 }, { name: 'Coupe 4', type: 'Coupe', capacity: 2 }
    ];
    let berth = 0;
    for (const unit of units) { berth += unit.capacity; if (number <= berth) return { layoutUnit: unit.name, compartmentType: unit.type }; }
  }
  const groupSize = cls === '2A' ? 6 : (cls === 'CC' || cls === '2S') ? 6 : (cls === '3A' || cls === '3E' || cls === 'SL') ? 8 : 6;
  const group = Math.ceil(number / groupSize);
  return { layoutUnit: (cls === 'CC' || cls === '2S') ? `Row ${group}` : `Bay ${group}`, compartmentType: (cls === 'CC' || cls === '2S') ? 'Chair row' : 'Berth bay' };
}

function compositionFor(train) {
  if (train.coachComposition?.length) return train.coachComposition;
  return (train.classes || []).flatMap(cls => DEFAULT_COMPOSITION[cls] || []).map(coach => ({
    ...coach, classType: Object.keys(DEFAULT_COMPOSITION).find(cls => DEFAULT_COMPOSITION[cls].some(c => c.coachNumber === coach.coachNumber)),
    layout: coach.classType === 'CC' ? 'chair-cc' : undefined
  }));
}

async function ensureInventory(train, date, cls) {
  const coaches = train.coachComposition?.length
    ? train.coachComposition.filter(c => c.classType === cls)
    : (DEFAULT_COMPOSITION[cls] || []).map(c => ({ ...c, classType: cls }));
  if (!coaches.length) return [];
  // Protect existing confirmed seats from the legacy Schedule-based allocator.
  const legacySchedule = await Schedule.findOne({ train: train._id, date }).select('seats');
  const legacyBooked = new Set((legacySchedule?.seats || [])
    .filter(seat => seat.classType === cls && seat.bookings?.length)
    .map(seat => `${seat.coach}/${seat.seatNumber}`));
  const ops = [];
  const layoutBackfills = [];
  for (const coach of coaches) {
    const capacity = coach.capacity || (DEFAULT_COMPOSITION[cls]?.find(c => c.coachNumber === coach.coachNumber)?.capacity) || 72;
    for (let number = 1; number <= capacity; number++) {
      const layout = layoutInfo(cls, coach, number);
      ops.push({ updateOne: {
        filter: { train: train._id, date, seatClass: cls, coach: coach.coachNumber, seatNumber: number },
        update: { $setOnInsert: { train: train._id, date, seatClass: cls, coach: coach.coachNumber, seatNumber: number, seatType: berthType(cls, number), ...layout, status: legacyBooked.has(`${coach.coachNumber}/${number}`) ? 'BOOKED' : 'AVAILABLE' } },
        upsert: true
      } });
      layoutBackfills.push({ updateOne: {
        filter: { train: train._id, date, seatClass: cls, coach: coach.coachNumber, seatNumber: number, layoutUnit: { $exists: false } },
        update: { $set: layout }
      } });
    }
  }
  if (ops.length) await SeatInventory.bulkWrite(ops, { ordered: false });
  if (layoutBackfills.length) await SeatInventory.bulkWrite(layoutBackfills, { ordered: false });
  return coaches;
}

async function releaseExpiredHolds(filter = {}) {
  const expired = await SeatInventory.find({ ...filter, status: 'HELD', holdExpiresAt: { $lte: new Date() } }).select('holdId holdBy');
  const holdIds = [...new Set(expired.map(seat => seat.holdId).filter(Boolean))];
  await SeatInventory.updateMany({ ...filter, status: 'HELD', holdExpiresAt: { $lte: new Date() } }, {
    $set: { status: 'AVAILABLE' }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 }
  });
  if (holdIds.length) {
    const pending = await Booking.find({ holdId: { $in: holdIds }, status: 'Pending', paymentStatus: 'Pending' }).select('_id user');
    await Booking.updateMany({ _id: { $in: pending.map(b => b._id) }, status: 'Pending' }, { $set: { status: 'Cancelled' } });
    if (pending.length) await Notification.insertMany(pending.map(b => ({ user: b.user, title: 'Seat hold expired', message: `Your selected sample seats were released after the ${HOLD_MINUTES}-minute hold expired.`, type: 'HoldExpired' })));
  }
}

module.exports = { DEFAULT_COMPOSITION, berthType, layoutInfo, ensureInventory, releaseExpiredHolds, HOLD_MINUTES };
