const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginSchema, refreshSchema, createStaffSchema } = require('../validators/auth.validator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);

// Super Admin staff creation - not in the PDF's "Required" list verbatim,
// but required to satisfy "Super Admin: Create Doctors / Create
// Receptionists" from the RBAC requirements.
router.post(
  '/staff/:role(doctor|receptionist)',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate(createStaffSchema),
  authController.createStaff
);

module.exports = router;
