const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  coach: { type: String }, // e.g. S1
  seatNumber: { type: Number }, // e.g. 15
  seatType: { type: String }, // e.g. LB
  preferredBerth: { type: String, enum: ['No preference', 'Lower Berth', 'Middle Berth', 'Upper Berth', 'Side Lower Berth', 'Side Upper Berth'], default: 'No preference' }
});

const bookingSchema = new mongoose.Schema({
  pnr: { type: String, required: true, unique: true, index: true },
  bookingId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  seatClass: { type: String, required: true }, // SL, 3A, 2A, 1A, CC, 2S
  source: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  boardingStation: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  passengers: [passengerSchema],
  totalFare: { type: Number, required: true },
  holdId: { type: String },
  fareBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  simulated: { type: Boolean, default: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
  paymentId: { type: String }, // Simulated payment reference
  refundAmount: { type: Number, default: 0 },
  refundStatus: { type: String, enum: ['None', 'Initiated', 'Completed'], default: 'None' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
