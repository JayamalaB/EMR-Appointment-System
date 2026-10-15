const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const slotService = require('../services/slot.service');

const getSlots = asyncHandler(async (req, res) => {
  const { doctor, date } = req.query;
  const result = await slotService.getSlotsForDoctorAndDate(doctor, date);
  return new ApiResponse(200, 'Slots fetched successfully', result).send(res);
});

module.exports = { getSlots };
