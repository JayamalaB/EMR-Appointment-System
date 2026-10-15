/**
 * Idempotent seed script - creates a baseline dataset so the app is usable
 * immediately after `npm run seed`:
 *   - 1 Super Admin login
 *   - 1 Receptionist login
 *   - 2 Departments
 *   - 2 Doctors (with logins + a working weekly schedule)
 *
 * Safe to re-run: existing records are detected by unique fields and left
 * untouched rather than duplicated.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../config/logger');

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const DoctorSchedule = require('../models/DoctorSchedule');

const STANDARD_WEEK = (workingDays) =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: workingDays.includes(dayOfWeek),
    sessions: workingDays.includes(dayOfWeek)
      ? [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '17:00' },
        ]
      : [],
    breaks: workingDays.includes(dayOfWeek) ? [{ startTime: '12:00', endTime: '13:00' }] : [],
  }));

async function upsertUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (user) return user;
  const passwordHash = await User.hashPassword(password);
  user = await User.create({ name, email, passwordHash, role, isActive: true });
  logger.info(`Created ${role} user: ${email}`);
  return user;
}

async function upsertDepartment(name, code) {
  let dept = await Department.findOne({ code });
  if (dept) return dept;
  dept = await Department.create({ name, code });
  logger.info(`Created department: ${name}`);
  return dept;
}

async function upsertDoctor({ name, email, password, department, specialization, workingDays }) {
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await User.hashPassword(password);
    user = await User.create({ name, email, passwordHash, role: 'doctor', isActive: true });
  }

  let doctor = await Doctor.findOne({ user: user._id });
  if (!doctor) {
    doctor = await Doctor.create({ user: user._id, name, department, specialization });
    user.doctorProfile = doctor._id;
    await user.save();
    logger.info(`Created doctor: ${name} (${email})`);
  }

  const existingSchedule = await DoctorSchedule.findOne({ doctor: doctor._id });
  if (!existingSchedule) {
    await DoctorSchedule.create({
      doctor: doctor._id,
      slotDurationMinutes: 15,
      weeklySchedule: STANDARD_WEEK(workingDays),
    });
    logger.info(`Created schedule for: ${name}`);
  }

  return doctor;
}

async function run() {
  await mongoose.connect(env.mongoUri);
  logger.info('Connected to MongoDB for seeding');

  await upsertUser({
    name: 'Super Admin',
    email: env.seed.superAdminEmail,
    password: env.seed.superAdminPassword,
    role: 'super_admin',
  });

  await upsertUser({
    name: 'Front Desk Receptionist',
    email: 'receptionist@emr.local',
    password: 'ChangeMe123!',
    role: 'receptionist',
  });

  const cardiology = await upsertDepartment('Cardiology', 'CARD');
  const general = await upsertDepartment('General Medicine', 'GEN');

  await upsertDoctor({
    name: 'Dr. Asha Rao',
    email: 'asha.rao@emr.local',
    password: 'ChangeMe123!',
    department: cardiology._id,
    specialization: 'Cardiologist',
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  });

  await upsertDoctor({
    name: 'Dr. Vikram Shah',
    email: 'vikram.shah@emr.local',
    password: 'ChangeMe123!',
    department: general._id,
    specialization: 'General Physician',
    workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  });

  logger.info('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error(`Seeding failed: ${err.message}`);
  process.exit(1);
});
