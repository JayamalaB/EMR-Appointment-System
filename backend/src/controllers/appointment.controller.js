const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const appointmentService = require('../services/appointment.service');
const auditService = require('../services/audit.service');
const { emitAppointmentEvent } = require('../sockets');
const { AUDIT_ACTIONS, SOCKET_EVENTS } = require('../utils/constants');

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment(req.body, req.user);

  await auditService.record({
    user: req.user,
    action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
    entity: 'Appointment',
    entityId: appointment._id,
    metadata: { doctor: appointment.doctor._id, slotStart: appointment.slotStart },
    ip: req.ip,
  });

  emitAppointmentEvent(SOCKET_EVENTS.APPOINTMENT_CREATED, appointment);

  return new ApiResponse(201, 'Appointment created successfully', appointment).send(res);
});

const listAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.listAppointments(req.query, req.user);
  return new ApiResponse(200, 'Appointments fetched successfully', result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  }).send(res);
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(req.params.id, req.user);
  return new ApiResponse(200, 'Appointment fetched successfully', appointment).send(res);
});

const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateAppointment(req.params.id, req.body, req.user);

  await auditService.record({
    user: req.user,
    action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
    entity: 'Appointment',
    entityId: appointment._id,
    metadata: { changes: req.body },
    ip: req.ip,
  });

  emitAppointmentEvent(SOCKET_EVENTS.APPOINTMENT_UPDATED, appointment);

  return new ApiResponse(200, 'Appointment updated successfully', appointment).send(res);
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id, req.body.cancelReason, req.user);

  await auditService.record({
    user: req.user,
    action: AUDIT_ACTIONS.APPOINTMENT_CANCELLED,
    entity: 'Appointment',
    entityId: appointment._id,
    ip: req.ip,
  });

  emitAppointmentEvent(SOCKET_EVENTS.APPOINTMENT_CANCELLED, appointment);

  return new ApiResponse(200, 'Appointment cancelled successfully', appointment).send(res);
});

const markArrived = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.markArrived(req.params.id, req.user);

  await auditService.record({
    user: req.user,
    action: AUDIT_ACTIONS.APPOINTMENT_ARRIVED,
    entity: 'Appointment',
    entityId: appointment._id,
    ip: req.ip,
  });

  emitAppointmentEvent(SOCKET_EVENTS.APPOINTMENT_UPDATED, appointment);

  return new ApiResponse(200, 'Patient marked as arrived', appointment).send(res);
});

module.exports = {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  markArrived,
};
