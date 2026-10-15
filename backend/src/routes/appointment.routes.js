const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsSchema,
} = require('../validators/appointment.validator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST),
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(listAppointmentsSchema),
  appointmentController.listAppointments
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  appointmentController.getAppointment
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  validate(updateAppointmentSchema),
  appointmentController.updateAppointment
);

// Soft-delete semantics: DELETE cancels the appointment rather than
// destroying the record, since medical/audit history must be retained.
// See ENGINEERING_DECISIONS.md.
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST),
  appointmentController.cancelAppointment
);

router.post(
  '/:id/arrive',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST),
  appointmentController.markArrived
);

module.exports = router;
