const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema({
  trainNumber: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  source: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  classes: [{ type: String, enum: ['1A', '2A', '3A', '3E', 'SL', 'CC', '2S'], required: true }],
  // Sample/local inventory only. The provider layer can supply verified timetable data later.
  dataSource: { type: String, enum: ['sample', 'external'], default: 'sample' },
  coachComposition: [{
    coachNumber: { type: String, required: true },
    classType: { type: String, enum: ['1A', '2A', '3A', '3E', 'SL', 'CC', '2S'], required: true },
    capacity: { type: Number, min: 1 },
    layout: { type: String, enum: ['berth-1a', 'berth-2a', 'berth-3a', 'berth-3e', 'berth-sl', 'chair-cc', 'chair-2s'] },
    compartments: [{ name: String, type: { type: String, enum: ['Cabin', 'Coupe'] }, capacity: { type: Number, min: 1 } }]
  }],
  runsOn: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true }],
  baseFare: {
    SL: { type: Number, default: 2.0 }, // fare multiplier per stop or km
    '3A': { type: Number, default: 5.0 },
    '3E': { type: Number, default: 4.5 },
    '2A': { type: Number, default: 7.5 },
    '1A': { type: Number, default: 12.0 },
    'CC': { type: Number, default: 4.5 },
    '2S': { type: Number, default: 1.5 }
  },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

trainSchema.pre('validate', function validateCoachComposition(next) {
  const coaches = this.coachComposition || [];
  const coachKeys = coaches.map(coach => `${coach.classType}/${coach.coachNumber}`);
  if (new Set(coachKeys).size !== coachKeys.length) return next(new Error('Coach numbers must be unique within a class.'));
  for (const coach of coaches) {
    if (!(this.classes || []).includes(coach.classType)) return next(new Error(`Coach ${coach.coachNumber} uses class ${coach.classType}, which is not enabled on this train.`));
    if (coach.compartments?.length) {
      const berthCount = coach.compartments.reduce((sum, compartment) => sum + Number(compartment.capacity || 0), 0);
      if (coach.classType !== '1A' || berthCount !== Number(coach.capacity)) return next(new Error(`1A compartment capacities for ${coach.coachNumber} must add up to the coach capacity.`));
    }
  }
  next();
});

module.exports = mongoose.model('Train', trainSchema);
