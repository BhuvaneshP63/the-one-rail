const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const Station = require('../models/Station');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const SeatInventory = require('../models/SeatInventory');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { releaseExpiredHolds } = require('../utils/coachInventory');
const { ensureInventory } = require('../utils/coachInventory');
const { holdSeatBatch } = require('../utils/atomicSeatHold');
const { calculateSampleFare } = require('../utils/sampleFare');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/mailer');

// Generate PNR number (10 digits)
const generatePNR = () => {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
};

// Generate Booking ID (8 alphanumeric characters uppercase)
const generateBookingID = () => {
  return 'BK' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

const SUPPORTED_CLASSES = new Set(['1A', '2A', '3A', '3E', 'SL', 'CC', '2S']);
const LAYOUTS = { '1A': 'berth-1a', '2A': 'berth-2a', '3A': 'berth-3a', '3E': 'berth-3e', SL: 'berth-sl', CC: 'chair-cc', '2S': 'chair-2s' };
const EXTERNAL_PAYMENT_METHODS = { GPay: 'UPI', PhonePe: 'UPI', 'Net Banking': 'Netbanking', 'Credit / Debit Card': 'Card' };

async function externalStation(code, name) {
  const safeCode = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(safeCode)) throw new Error('A valid railway station code is required.');
  return Station.findOneAndUpdate(
    { code: safeCode },
    { $setOnInsert: { code: safeCode, name: String(name || safeCode).trim().slice(0, 120), state: 'External', zone: 'EXT' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

// @desc    Confirm a locally simulated reservation for an external timetable train
// @route   POST /api/bookings/external/confirm
// @access  Private
exports.confirmExternalDemoBooking = async (req, res) => {
  const { trainNumber, trainName, date, from, to, coach, seatClass, capacity, seats, passengers, departureTime, arrivalTime, distanceKm, paymentMethod } = req.body;
  let held;
  let booking;
  try {
    if (!trainNumber || !trainName || !from?.code || !to?.code || !coach || !SUPPORTED_CLASSES.has(seatClass) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Array.isArray(seats) || !Array.isArray(passengers) || !passengers.length || passengers.length > 6 || seats.length !== passengers.length) {
      return res.status(400).json({ success: false, message: 'Complete journey, passenger and seat details are required.' });
    }
    if (date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ success: false, message: 'Choose a valid future journey date.' });
    if (new Set(seats.map(Number)).size !== seats.length || seats.some(seat => !Number.isInteger(Number(seat)) || Number(seat) < 1 || Number(seat) > Number(capacity || 0))) return res.status(400).json({ success: false, message: 'Choose distinct valid seats for every passenger.' });
    if (passengers.some(passenger => !passenger.name?.trim() || !Number.isInteger(Number(passenger.age)) || Number(passenger.age) < 1 || Number(passenger.age) > 120 || !['Male', 'Female', 'Other'].includes(passenger.gender))) return res.status(400).json({ success: false, message: 'Enter valid details for every passenger.' });
    if (from.code === to.code) return res.status(400).json({ success: false, message: 'Source and destination must be different.' });
    const normalizedPaymentMethod = EXTERNAL_PAYMENT_METHODS[paymentMethod];
    if (!normalizedPaymentMethod) return res.status(400).json({ success: false, message: 'Choose a valid payment method.' });

    const [source, destination] = await Promise.all([externalStation(from.code, from.name), externalStation(to.code, to.name)]);
    const localTrainNumber = `RR-${String(trainNumber).replace(/[^A-Za-z0-9-]/g, '').slice(0, 20)}`;
    const safeCapacity = Math.min(120, Math.max(1, Number(capacity)));
    const train = await Train.findOneAndUpdate(
      { trainNumber: localTrainNumber },
      { $set: { name: String(trainName).trim().slice(0, 160), source: source._id, destination: destination._id, classes: [seatClass], dataSource: 'external', coachComposition: [{ coachNumber: String(coach).trim().slice(0, 20), classType: seatClass, capacity: safeCapacity, layout: LAYOUTS[seatClass] }], runsOn: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], baseFare: { [seatClass]: 1 }, active: true } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await Route.findOneAndUpdate(
      { train: train._id },
      { $set: { train: train._id, stops: [
        { station: source._id, stopIndex: 0, arrivalTime: 'Source', departureTime: departureTime || '00:00', distanceKm: 0, dayNumber: 1 },
        { station: destination._id, stopIndex: 1, arrivalTime: arrivalTime || '23:59', departureTime: 'Destination', distanceKm: Math.max(1, Number(distanceKm) || 1), dayNumber: 1 }
      ] } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await ensureInventory(train, date, seatClass);
    await releaseExpiredHolds({ train: train._id, date, seatClass });
    const holdId = crypto.randomUUID();
    held = await holdSeatBatch({ inventory: SeatInventory, scope: { train: train._id, date, seatClass, coach: String(coach).trim() }, seatNumbers: seats.map(Number), userId: req.user._id, holdId, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    if (!held.success) return res.status(409).json({ success: false, message: `Seat ${held.seatNumber} was just booked by another user. Choose a different seat.` });

    const farePerPassenger = 420;
    booking = await Booking.create({
      pnr: generatePNR(), bookingId: generateBookingID(), user: req.user._id, train: train._id, date, seatClass,
      source: source._id, destination: destination._id, boardingStation: source._id, holdId,
      passengers: passengers.map((passenger, index) => ({ ...passenger, coach: String(coach).trim(), seatNumber: Number(seats[index]), seatType: held.held.find(item => item.seatNumber === Number(seats[index]))?.seatType || 'Seat', preferredBerth: 'No preference' })),
      totalFare: farePerPassenger * passengers.length,
      fareBreakdown: { class: seatClass, farePerPassenger, passengerCount: passengers.length, total: farePerPassenger * passengers.length, source: 'External timetable / local simulated reservation' },
      status: 'Pending', paymentStatus: 'Pending', paymentId: `MOCK_${String(paymentMethod).replace(/\W/g, '').toUpperCase()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    });
    const payment = await Payment.create({ booking: booking._id, amount: booking.totalFare, orderId: `order_mock_external_${crypto.randomBytes(5).toString('hex')}`, paymentId: booking.paymentId, signature: 'MOCK_SIGNATURE', status: 'Captured', method: normalizedPaymentMethod });
    const confirmed = await SeatInventory.updateMany(
      { _id: { $in: held.held.map(item => item._id) }, status: 'HELD', holdId, holdBy: req.user._id },
      { $set: { status: 'BOOKED', booking: booking._id }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 } }
    );
    if (confirmed.modifiedCount !== passengers.length) {
      await SeatInventory.updateMany({ _id: { $in: held.held.map(item => item._id) }, holdId, status: 'HELD' }, { $set: { status: 'AVAILABLE' }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 } });
      await Booking.findByIdAndUpdate(booking._id, { $set: { status: 'Cancelled' } });
      await Payment.findByIdAndUpdate(payment._id, { $set: { status: 'Failed' } });
      return res.status(409).json({ success: false, message: 'Seats changed while confirming. Please choose again.' });
    }
    booking.status = 'Confirmed';
    booking.paymentStatus = 'Paid';
    await booking.save();
    await Notification.create({ user: req.user._id, title: 'Demo reservation confirmed', message: `Your local simulated reservation for ${train.name} is confirmed. PNR: ${booking.pnr}. Seats: ${booking.passengers.map(passenger => `${passenger.coach}/${passenger.seatNumber}`).join(', ')}.`, type: 'Booking' }).catch(() => {});
    res.status(201).json({ success: true, message: 'Simulated payment completed and seats are reserved until cancellation.', booking: { id: booking._id, pnr: booking.pnr, bookingId: booking.bookingId, totalFare: booking.totalFare } });
  } catch (error) {
    // Do not leave a failed simulated payment visible as a reservation or block seats.
    if (booking?.paymentStatus !== 'Paid') await Booking.findByIdAndDelete(booking._id).catch(() => {});
    if (held?.held?.length) await SeatInventory.updateMany(
      { _id: { $in: held.held.map(item => item._id) }, status: 'HELD' },
      { $set: { status: 'AVAILABLE' }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 } }
    ).catch(() => {});
    res.status(500).json({ success: false, message: error.message || 'Could not confirm the reservation.' });
  }
};

// @desc    Return locally reserved seats for an external timetable train/date
// @route   GET /api/bookings/external/reserved
// @access  Public (booking identity remains private)
exports.getExternalReservedSeats = async (req, res) => {
  try {
    const { trainNumber, date } = req.query;
    if (!trainNumber || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ success: false, message: 'Train and journey date are required.' });
    const localTrainNumber = `RR-${String(trainNumber).replace(/[^A-Za-z0-9-]/g, '').slice(0, 20)}`;
    const train = await Train.findOne({ trainNumber: localTrainNumber }).select('_id');
    if (!train) return res.json({ success: true, reserved: {} });
    const rows = await SeatInventory.find({ train: train._id, date, status: 'BOOKED' }).select('coach seatNumber');
    const reserved = rows.reduce((all, row) => {
      if (!all[row.coach]) all[row.coach] = [];
      all[row.coach].push(row.seatNumber);
      return all;
    }, {});
    res.json({ success: true, reserved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Could not load reserved seats.' });
  }
};

// @desc    Create a pending booking and simulated payment order
// @route   POST /api/bookings/create
// @access  Private
exports.createBookingOrder = async (req, res) => {
  try {
    const { trainId, date, seatClass, fromStation, toStation, boardingStation, passengers, holdId, seats } = req.body;

    if (!trainId || !date || !seatClass || !fromStation || !toStation || !boardingStation || !Array.isArray(passengers) || passengers.length === 0 || passengers.length > 6 || !holdId || !Array.isArray(seats) || seats.length !== passengers.length) {
      return res.status(400).json({ success: false, message: 'All booking fields and passenger list are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ success: false, message: 'Choose a valid journey date that is not in the past.' });
    if (passengers.some(p => !p.name?.trim() || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120 || !['Male', 'Female', 'Other'].includes(p.gender)) || new Set(seats.map(s => `${s.coach}/${s.seatNumber}`)).size !== passengers.length) return res.status(400).json({ success: false, message: 'Passenger details and unique seat selections must be valid.' });
    const validPreferences = ['No preference', 'Lower Berth', 'Middle Berth', 'Upper Berth', 'Side Lower Berth', 'Side Upper Berth'];
    if (passengers.some(p => p.preferredBerth && !validPreferences.includes(p.preferredBerth)) || ['CC', '2S'].includes(seatClass) && passengers.some(p => p.preferredBerth && p.preferredBerth !== 'No preference')) return res.status(400).json({ success: false, message: 'Berth preferences are available only for sleeping classes.' });

    await releaseExpiredHolds({ train: trainId, date, seatClass });
    const heldSeats = await SeatInventory.find({ train: trainId, date, seatClass, holdId, holdBy: req.user._id, status: 'HELD', holdExpiresAt: { $gt: new Date() } });
    if (heldSeats.length !== passengers.length || seats.some(s => !heldSeats.some(h => h.coach === s.coach && h.seatNumber === Number(s.seatNumber)))) return res.status(409).json({ success: false, message: 'Your seat hold expired or no longer matches. Select seats again.' });

    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }
    const [journeyYear, journeyMonth, journeyDate] = date.split('-').map(Number);
    const journeyWeekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(journeyYear, journeyMonth - 1, journeyDate)).getUTCDay()];
    if (!train.runsOn.includes(journeyWeekday)) return res.status(400).json({ success: false, message: 'This sample train does not run on the selected day.' });

    const route = await Route.findOne({ train: trainId });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found for this train' });
    }

    const fromStop = route.stops.find(s => s.station.toString() === fromStation);
    const toStop = route.stops.find(s => s.station.toString() === toStation);
    const boardingStop = route.stops.find(s => s.station.toString() === boardingStation);

    if (!fromStop || !toStop || !boardingStop) {
      return res.status(400).json({ success: false, message: 'Invalid stations for this train route' });
    }

    if (fromStop.stopIndex >= toStop.stopIndex) {
      return res.status(400).json({ success: false, message: 'Boarding station must be before destination station' });
    }

    // 1. Calculate fare
    const distance = toStop.distanceKm - fromStop.distanceKm;
    const multiplier = train.baseFare[seatClass] || 1.5;
    const baseFare = calculateSampleFare(distance, multiplier);
    const totalFare = baseFare * passengers.length;

    // Seat availability is managed in the local seat inventory collection.
    if (!train.classes.includes(seatClass)) return res.status(400).json({ success: false, message: 'This class is not offered on this train.' });

    // Payments are simulated in this demonstration.
    const razorpayOrderId = 'order_mock_' + crypto.randomBytes(6).toString('hex');

    // 4. Create pending booking record
    const pnr = generatePNR();
    const bookingId = generateBookingID();

    const booking = new Booking({
      pnr,
      bookingId,
      user: req.user._id,
      train: trainId,
      date,
      seatClass,
      source: fromStation,
      destination: toStation,
      boardingStation,
      passengers: passengers.map(p => ({
        name: p.name,
        age: p.age,
        gender: p.gender,
        coach: seats[passengers.indexOf(p)].coach,
        seatNumber: Number(seats[passengers.indexOf(p)].seatNumber),
        seatType: heldSeats.find(h => h.coach === seats[passengers.indexOf(p)].coach && h.seatNumber === Number(seats[passengers.indexOf(p)].seatNumber))?.seatType || 'Seat',
        preferredBerth: p.preferredBerth || 'No preference'
      })),
      totalFare,
      holdId,
      fareBreakdown: { class: seatClass, farePerPassenger: baseFare, passengerCount: passengers.length, total: totalFare },
      status: 'Pending',
      paymentStatus: 'Pending',
      paymentId: razorpayOrderId // Temporary simulated order reference
    });

    await booking.save();

    res.status(201).json({
      success: true,
      booking: {
        id: booking._id,
        pnr,
        bookingId,
        totalFare,
        razorpayOrderId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify payment and allocate seats
// @route   POST /api/bookings/verify
// @access  Private
exports.verifyPaymentAndAllocate = async (req, res) => {
  try {
    const { bookingId, paymentId, orderId, signature, method } = req.body;

    if (!bookingId || !orderId) {
      return res.status(400).json({ success: false, message: 'Booking ID and Order ID are required' });
    }

    // 1. Fetch pending booking
    const booking = await Booking.findById(bookingId)
      .populate('train')
      .populate('source')
      .populate('destination')
      .populate('boardingStation')
      .populate('user');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentId !== orderId) return res.status(400).json({ success: false, message: 'Payment order does not match this booking.' });

    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized to confirm this booking.' });

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'This booking has already been paid and processed' });
    }

    if (!orderId.startsWith('order_mock_')) return res.status(400).json({ success: false, message: 'Only simulated payment orders are supported.' });

    // Confirm only the passenger's still-active holds. Conditional atomic updates prevent double booking.
    const heldSeats = await SeatInventory.find({ train: booking.train._id, date: booking.date, seatClass: booking.seatClass, holdId: booking.holdId, holdBy: booking.user._id, status: 'HELD', holdExpiresAt: { $gt: new Date() } });
    if (heldSeats.length !== booking.passengers.length) return res.status(409).json({ success: false, message: 'The seat hold expired. Please start a new booking.' });
    const heldSeatIds = heldSeats.map(seat => seat._id);
    const confirmation = await SeatInventory.updateMany(
      { _id: { $in: heldSeatIds }, train: booking.train._id, date: booking.date, seatClass: booking.seatClass, status: 'HELD', holdId: booking.holdId, holdBy: booking.user._id, holdExpiresAt: { $gt: new Date() } },
      { $set: { status: 'BOOKED', booking: booking._id }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 } }
    );
    if (confirmation.modifiedCount !== booking.passengers.length) {
      await SeatInventory.updateMany({ _id: { $in: heldSeatIds }, booking: booking._id, status: 'BOOKED' }, { $set: { status: 'AVAILABLE' }, $unset: { booking: 1 } });
      return res.status(409).json({ success: false, message: 'One or more selected seats are no longer available.' });
    }

    // 5. Update booking status
    booking.paymentStatus = 'Paid';
    booking.status = 'Confirmed';
    booking.paymentId = paymentId || 'MOCK_TXN_' + crypto.randomBytes(5).toString('hex').toUpperCase();
    await booking.save();

    // 6. Record payment transaction
    const payment = new Payment({
      booking: booking._id,
      amount: booking.totalFare,
      orderId,
      paymentId: booking.paymentId,
      signature: signature || 'MOCK_SIGNATURE',
      status: 'Captured',
      method: method || 'Mock'
    });
    await payment.save();

    // 7. Add notification
    const notification = new Notification({
      user: booking.user._id,
      title: 'Sample reservation confirmed',
      message: `Your booking for Train ${booking.train.trainNumber} on ${booking.date} is confirmed. PNR: ${booking.pnr}. Coach: ${booking.passengers[0].coach}, Seats: ${booking.passengers.map(p => p.seatNumber).join(', ')}.`,
      type: 'Booking'
    });
    await notification.save();

    // 8. Generate PDF and send Email in background
    try {
      const pdfBuffer = await generateTicketPDF(booking);
      const mailDetails = {
        pnr: booking.pnr,
        trainNumber: booking.train.trainNumber,
        trainName: booking.train.name,
        date: booking.date,
        fromStation: `${booking.source.name} (${booking.source.code})`,
        toStation: `${booking.destination.name} (${booking.destination.code})`,
        passengers: booking.passengers.map(p => `${p.name} (Seat ${p.coach}/${p.seatNumber})`)
      };
      
      // Send the email (handled safely, won't crash if SMTP app password missing)
      await sendTicketEmail(booking.user.email, booking.user.name, mailDetails, pdfBuffer);
    } catch (pdfMailError) {
      console.error('Failed to generate PDF or send email:', pdfMailError);
    }

    res.json({
      success: true,
      message: 'Simulated booking confirmed with the selected sample seats.',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel a booking
// @route   POST /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('train')
      .populate('source')
      .populate('destination')
      .populate('user');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify user owns this booking (admins can cancel anyone's)
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }
    if (booking.status !== 'Confirmed') return res.status(400).json({ success: false, message: 'Only confirmed bookings can be cancelled.' });
    const cancellationClaim = await Booking.updateOne({ _id: booking._id, status: 'Confirmed' }, { $set: { status: 'Cancelled' } });
    if (cancellationClaim.modifiedCount !== 1) return res.status(409).json({ success: false, message: 'Booking status changed. Refresh and try again.' });
    booking.status = 'Cancelled';

    // 1. Release seats in Schedule
    const schedule = await Schedule.findOne({ train: booking.train._id, date: booking.date });
    const legacyReleasedSeats = [];
    
    if (schedule) {
      // Find each seat assigned to this booking and remove the booking index
      schedule.seats.forEach(seat => {
        if (seat.classType === booking.seatClass) {
          const hadThisBooking = seat.bookings.some(b => b.bookingId.toString() === booking._id.toString());
          seat.bookings = seat.bookings.filter(b => b.bookingId.toString() !== booking._id.toString());
          if (hadThisBooking && seat.bookings.length === 0) legacyReleasedSeats.push({ coach: seat.coach, seatNumber: seat.seatNumber });
        }
      });
      schedule.markModified('seats');
      await schedule.save();
    }
    await SeatInventory.updateMany({ booking: booking._id, status: 'BOOKED' }, { $set: { status: 'AVAILABLE' }, $unset: { booking: 1 } });
    if (legacyReleasedSeats.length) await SeatInventory.bulkWrite(legacyReleasedSeats.map(seat => ({ updateOne: {
      filter: { train: booking.train._id, date: booking.date, seatClass: booking.seatClass, coach: seat.coach, seatNumber: seat.seatNumber, status: 'BOOKED', booking: { $exists: false } },
      update: { $set: { status: 'AVAILABLE' } }
    } })));

    // 2. Calculate refund (15% deduction, min charge Rs 60 per passenger)
    const deduction = Math.max(60 * booking.passengers.length, booking.totalFare * 0.15);
    const refundAmount = Math.max(0, booking.totalFare - deduction);

    // 3. Update booking status
    booking.status = 'Cancelled';
    booking.paymentStatus = 'Refunded';
    booking.refundAmount = refundAmount;
    booking.refundStatus = 'Completed';
    await booking.save();

    // 4. Create Notification
    const notification = new Notification({
      user: booking.user._id,
      title: 'Booking Cancelled',
      message: `Your simulated booking for Train ${booking.train.trainNumber} has been cancelled. Simulated refund: Rs. ${refundAmount.toFixed(2)}. PNR: ${booking.pnr}.`,
      type: 'Cancellation'
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Simulated booking cancelled and sample seats released.',
      refundDetails: {
        totalPaid: booking.totalFare,
        cancellationCharges: deduction,
        refundAmount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get booking details
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('train')
      .populate('source')
      .populate('destination')
      .populate('boardingStation');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user booking history
// @route   GET /api/bookings/history
// @access  Private
exports.getBookingHistory = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('train')
      .populate('source')
      .populate('destination')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download PDF Ticket
// @route   GET /api/bookings/:id/download
// @access  Private
exports.downloadTicket = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('train')
      .populate('source')
      .populate('destination')
      .populate('boardingStation')
      .populate('user');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const pdfBuffer = await generateTicketPDF(booking);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ticket_PNR_${booking.pnr}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check PNR Status
// @route   GET /api/bookings/pnr/:pnr
// @access  Public
exports.checkPnrStatus = async (req, res) => {
  try {
    const booking = await Booking.findOne({ pnr: req.params.pnr })
      .populate('train')
      .populate('source')
      .populate('destination')
      .populate('boardingStation');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'No booking found for this PNR' });
    }

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Sign in with the booking account to view this simulated PNR.' });

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
