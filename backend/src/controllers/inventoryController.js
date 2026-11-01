const crypto = require('crypto');
const Train = require('../models/Train');
const SeatInventory = require('../models/SeatInventory');
const Booking = require('../models/Booking');
const { ensureInventory, releaseExpiredHolds, HOLD_MINUTES } = require('../utils/coachInventory');
const { holdSeatBatch } = require('../utils/atomicSeatHold');

exports.getCoaches = async (req, res) => {
  const { trainId, date, seatClass } = req.query;
  if (!trainId || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !seatClass) return res.status(400).json({ success: false, message: 'Train, journey date and class are required.' });
  const train = await Train.findById(trainId);
  if (!train || !train.classes.includes(seatClass)) return res.status(404).json({ success: false, message: 'Train or class not found.' });
  await ensureInventory(train, date, seatClass);
  await releaseExpiredHolds({ train: trainId, date, seatClass });
  const coaches = await SeatInventory.aggregate([
    { $match: { train: train._id, date, seatClass } },
    { $group: { _id: '$coach', total: { $sum: 1 }, available: { $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] } } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, simulated: true, holdMinutes: HOLD_MINUTES, coaches: coaches.map(c => ({ coach: c._id, total: c.total, available: c.available })) });
};

exports.getCoachSeats = async (req, res) => {
  const { trainId, date, seatClass } = req.query;
  const train = await Train.findById(trainId);
  if (!train || !train.classes.includes(seatClass) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ success: false, message: 'Invalid train, date or class.' });
  await ensureInventory(train, date, seatClass);
  await releaseExpiredHolds({ train: trainId, date, seatClass });
  const seats = await SeatInventory.find({ train: trainId, date, seatClass, coach: req.params.coach }).select('seatNumber seatType status layoutUnit compartmentType').sort('seatNumber');
  if (!seats.length) return res.status(404).json({ success: false, message: 'Coach not found.' });
  res.json({ success: true, simulated: true, seats });
};

exports.holdSeats = async (req, res) => {
  const { trainId, date, seatClass, coach, seatNumbers } = req.body;
  if (!trainId || !coach || !Array.isArray(seatNumbers) || !seatNumbers.length || seatNumbers.length > 6 || new Set(seatNumbers).size !== seatNumbers.length || seatNumbers.some(n => !Number.isInteger(n) || n < 1)) return res.status(400).json({ success: false, message: 'Choose one distinct available seat per passenger.' });
  const train = await Train.findById(trainId);
  if (!train || !train.classes.includes(seatClass) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ success: false, message: 'Invalid train, date or class.' });
  await ensureInventory(train, date, seatClass);
  await releaseExpiredHolds({ train: trainId, date, seatClass });
  const holdId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const result = await holdSeatBatch({ inventory: SeatInventory, scope: { train: trainId, date, seatClass, coach }, seatNumbers, userId: req.user._id, holdId, expiresAt });
  if (!result.success) return res.status(409).json({ success: false, message: `Seat ${result.seatNumber} is no longer available. Refresh the coach layout.` });
  res.json({ success: true, holdId, expiresAt, seats: result.held.map(({ _id, coach: heldCoach, seatNumber, seatType }) => ({ _id, coach: heldCoach, seatNumber, seatType })) });
};

exports.releaseHold = async (req, res) => {
  const { holdId } = req.params;
  if (!holdId || typeof holdId !== 'string') return res.status(400).json({ success: false, message: 'Seat hold reference is required.' });
  const heldSeats = await SeatInventory.find({ holdId, holdBy: req.user._id, status: 'HELD' }).select('_id');
  if (!heldSeats.length) return res.json({ success: true, releasedSeats: 0 });
  await SeatInventory.updateMany({ _id: { $in: heldSeats.map(seat => seat._id) }, holdId, holdBy: req.user._id, status: 'HELD' }, {
    $set: { status: 'AVAILABLE' }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 }
  });
  await Booking.updateMany({ holdId, user: req.user._id, status: 'Pending', paymentStatus: 'Pending' }, { $set: { status: 'Cancelled' } });
  res.json({ success: true, releasedSeats: heldSeats.length });
};
