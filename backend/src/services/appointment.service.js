const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorSchedule = require('../models/DoctorSchedule');
const ApiError = require('../utils/ApiError');
const patientService = require('./patient.service');
const { APPOINTMENT_STATUS, ACTIVE_APPOINTMENT_STATUSES, ROLES } = require('../utils/constants');
const { generateDaySlots } = require('../utils/slotGenerator');

// Allowed forward transitions for the appointment status workflow:
//   scheduled -> arrived -> completed
//   scheduled|arrived -> cancelled
const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.SCHEDULED]: [APPOINTMENT_STATUS.ARRIVED, APPOINTMENT_STATUS.CANCELLED],
  [APPOINTMENT_STATUS.ARRIVED]: [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
};

async function assertSlotIsValid(doctorId, slotStartDate) {
  const now = new Date();
  if (slotStartDate.getTime() <= now.getTime()) {
    throw ApiError.badRequest('Cannot book a slot in the past');
  }

  const schedule = await DoctorSchedule.findOne({ doctor: doctorId });
  if (!schedule) throw ApiError.badRequest('Doctor has no configured schedule');

  const dayOfWeek = slotStartDate.getDay();
  const daySchedule = schedule.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isWorkingDay) {
    throw ApiError.badRequest('Doctor does not work on the selected day');
  }

  const hh = String(slotStartDate.getHours()).padStart(2, '0');
  const mm = String(slotStartDate.getMinutes()).padStart(2, '0');
  const requestedTime = `${hh}:${mm}`;

  const validDaySlots = generateDaySlots({
    sessions: daySchedule.sessions,
    breaks: daySchedule.breaks,
    slotDurationMinutes: schedule.slotDurationMinutes,
  });

  const match = validDaySlots.find((s) => s.startTime === requestedTime);
  if (!match) {
    throw ApiError.badRequest('Requested time is not a valid slot (outside working hours or inside a break)');
  }

  const slotEnd = new Date(slotStartDate);
  slotEnd.setMinutes(slotEnd.getMinutes() + schedule.slotDurationMinutes);
  return slotEnd;
}

/**
 * Creates an appointment. Double-booking is prevented at the database
 * layer by the partial unique index on {doctor, slotStart} in the
 * Appointment model (see models/Appointment.js) - that index is what
 * actually guarantees correctness under concurrent requests, not this
 * application-level check (which only gives a fast, friendly error in the
 * common case before hitting the DB constraint).
 *
 * When a new patient is supplied, patient creation + appointment creation
 * run inside a transaction so a half-created patient can never be left
 * behind if the appointment insert fails.
 */
async function createAppointment(payload, actor) {
  const { doctor: doctorId, department, slotStart, patientId, newPatient, purpose } = payload;

  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.isActive) throw ApiError.notFound('Doctor not found');
  if (doctor.department.toString() !== department) {
    throw ApiError.badRequest('Doctor does not belong to the specified department');
  }

  const slotStartDate = new Date(slotStart);
  if (Number.isNaN(slotStartDate.getTime())) throw ApiError.badRequest('Invalid slotStart');
  const slotEndDate = await assertSlotIsValid(doctorId, slotStartDate);

  const session = await mongoose.startSession();
  try {
    let appointment;
    await session.withTransaction(async () => {
      const patient = await patientService.getOrCreatePatient(
        { patientId, newPatient, createdBy: actor.id },
        session
      );

      const created = await Appointment.create(
        [
          {
            patient: patient._id,
            doctor: doctorId,
            department,
            slotStart: slotStartDate,
            slotEnd: slotEndDate,
            purpose: purpose || '',
            status: APPOINTMENT_STATUS.SCHEDULED,
            createdBy: actor.id,
          },
        ],
        { session }
      );
      appointment = created[0];
    });
    await session.endSession();
    return Appointment.findById(appointment._id).populate('patient doctor department');
  } catch (err) {
    await session.endSession();
    if (err.code === 11000) {
      // Someone else booked the exact same slot between our validation
      // check and the insert - the unique index caught it. Surface a
      // clean 409 rather than a raw duplicate-key error.
      throw ApiError.conflict('This slot was just booked by someone else. Please choose another slot.');
    }
    throw err;
  }
}

function buildListFilter(query, actor) {
  const filter = {};

  if (actor.role === ROLES.DOCTOR) {
    // Doctors may only ever see their own appointments, regardless of
    // what filters are passed in the query string.
    filter.doctor = actor.doctorProfile;
  } else if (query.doctor) {
    filter.doctor = query.doctor;
  }

  if (query.department) filter.department = query.department;
  if (query.status) filter.status = query.status;

  if (query.dateFrom || query.dateTo) {
    filter.slotStart = {};
    if (query.dateFrom) filter.slotStart.$gte = new Date(`${query.dateFrom}T00:00:00`);
    if (query.dateTo) filter.slotStart.$lte = new Date(`${query.dateTo}T23:59:59`);
  }

  return filter;
}

/**
 * Server-side search + filter + sort + pagination in a single aggregation
 * pass. Patient/mobile search requires a $lookup since those fields live
 * on the Patient collection, not Appointment.
 */
// Whitelisted so a query-string value can never inject an arbitrary/unindexed
// sort key into the aggregation pipeline.
const SORTABLE_FIELDS = new Set(['slotStart', 'status', 'createdAt']);

async function listAppointments(query, actor) {
  const filter = buildListFilter(query, actor);
  const page = query.page || 1;
  const limit = query.limit || 10;
  const sortField = SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'slotStart';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const pipeline = [
    { $match: filter },
    {
      $lookup: { from: 'patients', localField: 'patient', foreignField: '_id', as: 'patient' },
    },
    { $unwind: '$patient' },
  ];

  if (query.search) {
    pipeline.push({
      $match: {
        $or: [
          { 'patient.name': { $regex: query.search, $options: 'i' } },
          { 'patient.mobile': { $regex: query.search, $options: 'i' } },
          { 'patient.patientId': { $regex: query.search, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push(
    {
      $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doctor' },
    },
    { $unwind: '$doctor' },
    {
      $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'department' },
    },
    { $unwind: '$department' },
    { $sort: { [sortField]: sortOrder } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    }
  );

  const [result] = await Appointment.aggregate(pipeline);
  const items = result?.items || [];
  const total = result?.totalCount?.[0]?.count || 0;

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

async function getAppointmentById(id, actor) {
  const appointment = await Appointment.findById(id).populate('patient doctor department createdBy');
  if (!appointment) throw ApiError.notFound('Appointment not found');

  if (actor.role === ROLES.DOCTOR && appointment.doctor._id.toString() !== actor.doctorProfile) {
    throw ApiError.forbidden('You may only view your own appointments');
  }
  return appointment;
}

async function updateAppointment(id, updates, actor) {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw ApiError.notFound('Appointment not found');

  if (actor.role === ROLES.DOCTOR && appointment.doctor.toString() !== actor.doctorProfile) {
    throw ApiError.forbidden('You may only update your own appointments');
  }

  if (updates.status && updates.status !== appointment.status) {
    const allowed = ALLOWED_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes(updates.status)) {
      throw ApiError.badRequest(
        `Cannot transition appointment from "${appointment.status}" to "${updates.status}"`
      );
    }
    if (updates.status === APPOINTMENT_STATUS.ARRIVED) appointment.arrivedAt = new Date();
    if (updates.status === APPOINTMENT_STATUS.CANCELLED) {
      appointment.cancelledAt = new Date();
      appointment.cancelReason = updates.cancelReason || '';
    }
    appointment.status = updates.status;
  }

  if (updates.purpose !== undefined) appointment.purpose = updates.purpose;
  if (updates.notes !== undefined) appointment.notes = updates.notes;
  if (updates.consultationNotes !== undefined) {
    if (actor.role !== ROLES.DOCTOR && actor.role !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden('Only the treating doctor may update consultation notes');
    }
    appointment.consultationNotes = updates.consultationNotes;
  }

  await appointment.save();
  return Appointment.findById(appointment._id).populate('patient doctor department');
}

async function cancelAppointment(id, reason, actor) {
  return updateAppointment(id, { status: APPOINTMENT_STATUS.CANCELLED, cancelReason: reason }, actor);
}

async function markArrived(id, actor) {
  return updateAppointment(id, { status: APPOINTMENT_STATUS.ARRIVED }, actor);
}

module.exports = {
  createAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  markArrived,
  ACTIVE_APPOINTMENT_STATUSES,
};
