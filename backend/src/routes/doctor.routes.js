const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { upsertScheduleSchema } = require('../validators/schedule.validator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.get('/', authenticate, doctorController.getDoctors);

router.get(
  '/:doctorId/schedule',
  authenticate,
  doctorController.getSchedule
);

router.put(
  '/:doctorId/schedule',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate(upsertScheduleSchema),
  doctorController.upsertSchedule
);

module.exports = router;
