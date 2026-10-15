const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');

async function searchPatients({ search, page = 1, limit = 10 }) {
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Patient.countDocuments(filter),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

async function getOrCreatePatient({ patientId, newPatient, createdBy }, session) {
  if (patientId) {
    const patient = await Patient.findById(patientId).session(session || null);
    if (!patient) throw ApiError.notFound('Patient not found');
    return patient;
  }

  const [created] = await Patient.create(
    [
      {
        name: newPatient.name,
        mobile: newPatient.mobile,
        gender: newPatient.gender,
        dateOfBirth: newPatient.dateOfBirth,
        address: newPatient.address,
        createdBy,
      },
    ],
    { session: session || undefined }
  );
  return created;
}

module.exports = { searchPatients, getOrCreatePatient };
