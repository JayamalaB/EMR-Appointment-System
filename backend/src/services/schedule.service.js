const DoctorSchedule = require('../models/DoctorSchedule');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');

async function upsertSchedule(doctorId, { slotDurationMinutes, weeklySchedule }, updatedBy) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const schedule = await DoctorSchedule.findOneAndUpdate(
    { doctor: doctorId },
    { doctor: doctorId, slotDurationMinutes, weeklySchedule, updatedBy },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return schedule;
}

async function getScheduleForDoctor(doctorId) {
  const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
  if (!schedule) throw ApiError.notFound('No schedule configured for this doctor yet');
  return schedule;
}

module.exports = { upsertSchedule, getScheduleForDoctor };
