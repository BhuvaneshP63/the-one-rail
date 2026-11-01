const mongoose = require('mongoose');

const seatInventorySchema = new mongoose.Schema({
  train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
  date: { type: String, required: true },
  seatClass: { type: String, required: true },
  coach: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  seatType: { type: String, required: true },
  layoutUnit: { type: String },
  compartmentType: { type: String },
  status: { type: String, enum: ['AVAILABLE', 'HELD', 'BOOKED'], default: 'AVAILABLE', required: true },
  holdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  holdId: { type: String },
  holdExpiresAt: { type: Date },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }
}, { timestamps: true });

seatInventorySchema.index({ train: 1, date: 1, seatClass: 1, coach: 1, seatNumber: 1 }, { unique: true });
seatInventorySchema.index({ status: 1, holdExpiresAt: 1 });
module.exports = mongoose.model('SeatInventory', seatInventorySchema);
