const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  orderId: { type: String, required: true },
  paymentId: { type: String }, // Provided after payment success
  signature: { type: String }, // Verified signature from Razorpay
  status: { type: String, enum: ['Created', 'Captured', 'Failed'], default: 'Created' },
  method: { type: String, enum: ['UPI', 'Card', 'Netbanking', 'Wallet', 'Mock', 'None'], default: 'None' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
