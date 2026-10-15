const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  RECEPTIONIST: 'receptionist',
  DOCTOR: 'doctor',
});

const APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

// Statuses that still "occupy" a slot. Used for both slot-availability
// checks and the partial unique index that prevents double-booking.
const ACTIVE_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUS.SCHEDULED,
  APPOINTMENT_STATUS.ARRIVED,
  APPOINTMENT_STATUS.COMPLETED,
];

const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_ARRIVED: 'APPOINTMENT_ARRIVED',
  DOCTOR_CREATED: 'DOCTOR_CREATED',
  RECEPTIONIST_CREATED: 'RECEPTIONIST_CREATED',
  SCHEDULE_UPDATED: 'SCHEDULE_UPDATED',
});

const SOCKET_EVENTS = Object.freeze({
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_UPDATED: 'appointment:updated',
  APPOINTMENT_CANCELLED: 'appointment:cancelled',
});

module.exports = {
  ROLES,
  APPOINTMENT_STATUS,
  ACTIVE_APPOINTMENT_STATUSES,
  AUDIT_ACTIONS,
  SOCKET_EVENTS,
};
