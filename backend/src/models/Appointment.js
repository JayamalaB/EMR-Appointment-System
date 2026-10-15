const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, ACTIVE_APPOINTMENT_STATUSES } = require('../utils/constants');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },

    // Stored as real Date objects (not separate date/time strings) so range
    // queries (date filters, "past slot" checks) can use native Mongo
    // comparisons and indexes instead of string parsing.
    slotStart: { type: Date, required: true },
    slotEnd: { type: Date, required: true },

    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.SCHEDULED,
      index: true,
    },

    purpose: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    consultationNotes: { type: String, trim: true, default: '' }, // doctor-authored

    arrivedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// --- Concurrency safety ------------------------------------------------
// This partial unique index is the actual mechanism that prevents double
// booking. Two concurrent inserts for the same {doctor, slotStart} with an
// "active" status can never both succeed - MongoDB enforces uniqueness at
// the storage layer, so this holds even under race conditions that a
// pre-read / application-level check would miss. Cancelled appointments
// are excluded from the filter so a freed-up slot can be rebooked.
appointmentSchema.index(
  { doctor: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ACTIVE_APPOINTMENT_STATUSES } },
  }
);

// Common query patterns: scheduler/list filtering by date range, patient
// history, department dashboards, status filters combined with date range.
appointmentSchema.index({ slotStart: 1 });
appointmentSchema.index({ patient: 1, slotStart: -1 });
appointmentSchema.index({ department: 1, slotStart: 1 });
appointmentSchema.index({ status: 1, slotStart: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
