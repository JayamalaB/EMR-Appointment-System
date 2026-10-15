const Doctor = require('../models/Doctor');
const DoctorSchedule = require('../models/DoctorSchedule');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { generateDaySlots, materializeSlotsForDate } = require('../utils/slotGenerator');
const { ACTIVE_APPOINTMENT_STATUSES } = require('../utils/constants');

function startOfDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Builds the full availability picture for a doctor on a given date:
 * every slot the schedule allows, each tagged available/booked, with
 * past slots and break periods already excluded at generation time.
 */
async function getSlotsForDoctorAndDate(doctorId, dateStr) {
  const doctor = await Doctor.findById(doctorId).populate('department', 'name code');
  if (!doctor || !doctor.isActive) throw ApiError.notFound('Doctor not found');

  const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
  if (!schedule) throw ApiError.notFound('No schedule configured for this doctor yet');

  const requestedDate = startOfDay(dateStr);
  const today = startOfDay(new Date().toISOString().slice(0, 10));

  if (requestedDate < today) {
    // Past dates never have bookable slots - return an empty, clearly
    // labeled result instead of a 400 so the UI can still show "no slots"
    // when browsing history rather than treating it as a hard error.
    return { doctor, date: dateStr, slotDurationMinutes: schedule.slotDurationMinutes, slots: [], isPastDate: true };
  }

  const dayOfWeek = requestedDate.getDay();
  const daySchedule = schedule.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);

  if (!daySchedule || !daySchedule.isWorkingDay) {
    return { doctor, date: dateStr, slotDurationMinutes: schedule.slotDurationMinutes, slots: [], isWorkingDay: false };
  }

  const daySlots = generateDaySlots({
    sessions: daySchedule.sessions,
    breaks: daySchedule.breaks,
    slotDurationMinutes: schedule.slotDurationMinutes,
  });

  const materialized = materializeSlotsForDate(dateStr, daySlots);

  const bookedAppointments = await Appointment.find({
    doctor: doctorId,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    slotStart: { $gte: startOfDay(dateStr), $lte: endOfDay(dateStr) },
  })
    .select('slotStart status')
    .lean();

  const bookedTimes = new Set(bookedAppointments.map((a) => a.slotStart.toISOString()));

  const slots = materialized.map(({ startTime, endTime, start, end }) => ({
    startTime,
    endTime,
    start,
    end,
    isBooked: bookedTimes.has(start.toISOString()),
  }));

  return {
    doctor,
    date: dateStr,
    slotDurationMinutes: schedule.slotDurationMinutes,
    slots,
  };
}

module.exports = { getSlotsForDoctorAndDate, startOfDay, endOfDay };
