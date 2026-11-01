const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'REFUND_UPDATE'], required: true, index: true },
  resource: { type: String, enum: ['Train', 'Station', 'Booking'], required: true, index: true },
  resourceId: { type: String, required: true },
  summary: { type: String, required: true, maxlength: 240 },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
