const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../utils/constants');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true, index: true },
    entity: { type: String, required: true }, // e.g. "Appointment"
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
