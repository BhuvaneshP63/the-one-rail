const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  state: { type: String, required: true, trim: true },
  zone: { type: String, required: true, uppercase: true, trim: true }
});

module.exports = mongoose.model('Station', stationSchema);
