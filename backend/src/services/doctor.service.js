const Doctor = require('../models/Doctor');

async function listDoctors({ department, search } = {}) {
  const filter = { isActive: true };
  if (department) filter.department = department;
  if (search) filter.name = { $regex: search, $options: 'i' };

  return Doctor.find(filter).populate('department', 'name code').sort({ name: 1 }).lean();
}

module.exports = { listDoctors };
