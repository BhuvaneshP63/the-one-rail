const mongoose = require('mongoose');

const seatBookingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  fromStopIndex: { type: Number, required: true },
  toStopIndex: { type: Number, required: true }
});

const seatSchema = new mongoose.Schema({
  coach: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  classType: { type: String, required: true },
  seatType: { type: String, enum: ['LB', 'MB', 'UB', 'SL', 'SU', 'WS', 'SM'], required: true }, // Lower, Middle, Upper, Side Lower, Side Upper, Window Side, Side Middle (or similar)
  bookings: [seatBookingSchema]
});

const scheduleSchema = new mongoose.Schema({
  train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true, index: true },
  date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD for easier querying
  seats: [seatSchema]
});

// Compound index to ensure uniqueness of schedule per train per day
scheduleSchema.index({ train: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
