const express = require('express');
const authRoutes = require('./auth.routes');
const doctorRoutes = require('./doctor.routes');
const slotRoutes = require('./slot.routes');
const appointmentRoutes = require('./appointment.routes');
const patientRoutes = require('./patient.routes');

const router = express.Router();

router.get('/health', (_req, res) => res.status(200).json({ success: true, message: 'OK' }));

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/slots', slotRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/patients', patientRoutes);

module.exports = router;
