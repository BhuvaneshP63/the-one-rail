const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const savedTravellerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profilePicture: { type: String, default: '' },
  savedTravellers: [savedTravellerSchema],
  favoriteTrains: [{ type: String, trim: true }],
  favoriteRoutes: [{
    from: { type: String, required: true, uppercase: true, trim: true },
    fromName: { type: String, required: true, trim: true },
    to: { type: String, required: true, uppercase: true, trim: true },
    toName: { type: String, required: true, trim: true }
  }],
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash passwords
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
