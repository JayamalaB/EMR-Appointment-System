const express = require('express');
const patientController = require('../controllers/patient.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR),
  patientController.searchPatients
);

module.exports = router;
