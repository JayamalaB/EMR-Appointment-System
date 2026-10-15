const express = require('express');
const slotController = require('../controllers/slot.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { slotsQuerySchema } = require('../validators/appointment.validator');

const router = express.Router();

router.get('/', authenticate, validate(slotsQuerySchema), slotController.getSlots);

module.exports = router;
