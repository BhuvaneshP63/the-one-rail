const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema({
  trainNumber: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  source: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  classes: [{ type: String, enum: ['SL', '3A', '2A', '1A', 'CC', '2S'], required: true }],
  runsOn: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true }],
  baseFare: {
    SL: { type: Number, default: 2.0 }, // fare multiplier per stop or km
    '3A': { type: Number, default: 5.0 },
    '2A': { type: Number, default: 7.5 },
    '1A': { type: Number, default: 12.0 },
    'CC': { type: Number, default: 4.5 },
    '2S': { type: Number, default: 1.5 }
  },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Train', trainSchema);
