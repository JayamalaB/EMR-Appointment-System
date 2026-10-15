const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const doctorService = require('../services/doctor.service');
const scheduleService = require('../services/schedule.service');

const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorService.listDoctors({
    department: req.query.department,
    search: req.query.search,
  });
  return new ApiResponse(200, 'Doctors fetched successfully', doctors).send(res);
});

const upsertSchedule = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.upsertSchedule(req.params.doctorId, req.body, req.user.id);
  return new ApiResponse(200, 'Doctor schedule saved successfully', schedule).send(res);
});

const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.getScheduleForDoctor(req.params.doctorId);
  return new ApiResponse(200, 'Doctor schedule fetched successfully', schedule).send(res);
});

module.exports = { getDoctors, upsertSchedule, getSchedule };
