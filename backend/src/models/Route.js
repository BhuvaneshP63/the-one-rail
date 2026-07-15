const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  station: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  stopIndex: { type: Number, required: true }, // 0 for source, 1 for next stop, etc.
  arrivalTime: { type: String, required: true }, // e.g. "12:30" or "Source"
  departureTime: { type: String, required: true }, // e.g. "12:45" or "Destination"
  distanceKm: { type: Number, required: true, default: 0 },
  dayNumber: { type: Number, required: true, default: 1 } // Day 1, Day 2 of journey
});

const routeSchema = new mongoose.Schema({
  train: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true, unique: true, index: true },
  stops: [stopSchema]
});

module.exports = mongoose.model('Route', routeSchema);
