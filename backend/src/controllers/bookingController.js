const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const Station = require('../models/Station');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { getOrCreateSchedule, allocateBookingSeats } = require('../utils/seatAllocator');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/mailer');

// Initialize Razorpay if keys are available
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Generate PNR number (10 digits)
const generatePNR = () => {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
};

// Generate Booking ID (8 alphanumeric characters uppercase)
const generateBookingID = () => {
  return 'BK' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

// @desc    Create a pending booking & Razorpay order
// @route   POST /api/bookings/create
// @access  Private
exports.createBookingOrder = async (req, res) => {
  try {
    const { trainId, date, seatClass, fromStation, toStation, boardingStation, passengers } = req.body;

    if (!trainId || !date || !seatClass || !fromStation || !toStation || !boardingStation || !passengers || passengers.length === 0) {
      return res.status(400).json({ success: false, message: 'All booking fields and passenger list are required' });
    }

    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }

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
    const baseFare = Math.max(50, Math.round(distance * multiplier * 0.1) * 10);
    const totalFare = baseFare * passengers.length;

    // 2. Pre-verify seat availability on the segment
    const schedule = await getOrCreateSchedule(trainId, date, train.classes);
    const availableSeats = await allocateBookingSeats(
      schedule,
      seatClass,
      fromStop.stopIndex,
      toStop.stopIndex,
      passengers.length
    );

    if (!availableSeats) {
      return res.status(400).json({ success: false, message: 'Not enough seats available for this class on this segment' });
    }

    // 3. Generate Razorpay Order or Mock details
    let razorpayOrderId = 'order_mock_' + crypto.randomBytes(6).toString('hex');
    if (razorpayInstance) {
      try {
        const options = {
          amount: totalFare * 100, // amount in paisa
          currency: 'INR',
          receipt: `receipt_${generateBookingID()}`
        };
        const order = await razorpayInstance.orders.create(options);
        razorpayOrderId = order.id;
      } catch (err) {
        console.error('Razorpay Order Creation Error. Falling back to Mock Order.', err.message);
      }
    }

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
        coach: 'Pending',
        seatNumber: 0,
        seatType: 'None'
      })),
      totalFare,
      status: 'Confirmed', // Created as confirmed but pending payment
      paymentStatus: 'Pending',
      paymentId: razorpayOrderId // Store Razorpay Order ID here temporarily
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

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'This booking has already been paid and processed' });
    }

    // 2. Signature verification (if Razorpay credentials exist and it is not a mock order)
    if (razorpayInstance && !orderId.startsWith('order_mock_')) {
      const text = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ success: false, message: 'Razorpay payment signature verification failed' });
      }
    }

    // 3. Allocate seats from the Schedule Segment
    const route = await Route.findOne({ train: booking.train._id });
    const fromStop = route.stops.find(s => s.station.toString() === booking.source._id.toString());
    const toStop = route.stops.find(s => s.station.toString() === booking.destination._id.toString());

    const schedule = await getOrCreateSchedule(booking.train._id, booking.date, booking.train.classes);
    
    // Concurrency Lock: Check if seats are still available
    const allocatedSeats = await allocateBookingSeats(
      schedule,
      booking.seatClass,
      fromStop.stopIndex,
      toStop.stopIndex,
      booking.passengers.length
    );

    if (!allocatedSeats) {
      // Refund would be needed in real production, but here we error
      booking.status = 'Cancelled';
      await booking.save();
      return res.status(400).json({ success: false, message: 'Seats are no longer available for this segment. Booking Cancelled.' });
    }

    // 4. Update schedule and assign seats to passengers
    allocatedSeats.forEach((seat, idx) => {
      // Add booking interval to the seat
      seat.bookings.push({
        bookingId: booking._id,
        fromStopIndex: fromStop.stopIndex,
        toStopIndex: toStop.stopIndex
      });

      // Update passenger detail
      booking.passengers[idx].coach = seat.coach;
      booking.passengers[idx].seatNumber = seat.seatNumber;
      booking.passengers[idx].seatType = seat.seatType;
    });

    // Save schedule changes
    schedule.markModified('seats');
    await schedule.save();

    // 5. Update booking status
    booking.paymentStatus = 'Paid';
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
      title: 'Ticket Booked Successfully',
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
      message: 'Booking confirmed and seats allocated successfully',
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

    // 1. Release seats in Schedule
    const route = await Route.findOne({ train: booking.train._id });
    const fromStop = route.stops.find(s => s.station.toString() === booking.source._id.toString());
    const toStop = route.stops.find(s => s.station.toString() === booking.destination._id.toString());

    const schedule = await Schedule.findOne({ train: booking.train._id, date: booking.date });
    
    if (schedule) {
      // Find each seat assigned to this booking and remove the booking index
      schedule.seats.forEach(seat => {
        if (seat.classType === booking.seatClass) {
          seat.bookings = seat.bookings.filter(b => b.bookingId.toString() !== booking._id.toString());
        }
      });
      schedule.markModified('seats');
      await schedule.save();
    }

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
      message: `Your booking for Train ${booking.train.trainNumber} has been cancelled. Refund of Rs. ${refundAmount.toFixed(2)} processed to original source. PNR: ${booking.pnr}.`,
      type: 'Cancellation'
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully and refund initiated',
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

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
