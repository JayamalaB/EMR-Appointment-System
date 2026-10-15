const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const patientService = require('../services/patient.service');

const searchPatients = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await patientService.searchPatients({
    search,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });

  return new ApiResponse(200, 'Patients fetched successfully', result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  }).send(res);
});

module.exports = { searchPatients };
