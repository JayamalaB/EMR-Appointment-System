const mongoose = require('mongoose');

const timeWindowSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true }, // "HH:mm", 24h
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday
    isWorkingDay: { type: Boolean, default: true },
    sessions: { type: [timeWindowSchema], default: [] }, // e.g. Morning 09:00-12:00, Evening 13:00-17:00
    breaks: { type: [timeWindowSchema], default: [] }, // e.g. Lunch 12:00-13:00
  },
  { _id: false }
);

/**
 * One active schedule document per doctor. Slots are never stored directly -
 * they are generated on demand from this configuration (see
 * utils/slotGenerator.js + services/slot.service.js), so changing a
 * doctor's hours automatically reshapes future availability without a
 * data migration.
 */
const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
      index: true,
    },
    slotDurationMinutes: { type: Number, required: true, min: 5, max: 180, default: 15 },
    weeklySchedule: {
      type: [daySchema],
      validate: {
        validator: (arr) => arr.length === 7,
        message: 'weeklySchedule must define exactly 7 entries (one per day of week)',
      },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);
