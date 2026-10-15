const User = require('../models/User');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const tokenService = require('./token.service');

async function login({ email, password }, meta) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = tokenService.signAccessToken(user);
  const { rawToken: refreshToken } = await tokenService.issueRefreshToken(user, meta);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorProfile: user.doctorProfile,
    },
  };
}

async function refresh(rawRefreshToken, meta) {
  if (!rawRefreshToken) throw ApiError.unauthorized('Refresh token is required');

  const result = await tokenService.rotateRefreshToken(rawRefreshToken, meta);
  if (!result) throw ApiError.unauthorized('Invalid or expired refresh token');

  const accessToken = tokenService.signAccessToken(result.user);
  return { accessToken, refreshToken: result.rawToken, user: result.user };
}

async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    await tokenService.revokeRefreshToken(rawRefreshToken);
  }
}

/**
 * Super Admin creates Doctor or Receptionist accounts. Doctors additionally
 * get a Doctor profile document created and linked back to the User.
 */
async function createStaffUser({ name, email, password, role, department, specialization, createdBy }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role, createdBy });

  if (role === 'doctor') {
    if (!department) throw ApiError.badRequest('department is required when creating a doctor');
    const doctor = await Doctor.create({ user: user._id, name, department, specialization });
    user.doctorProfile = doctor._id;
    await user.save();
    return { user, doctor };
  }

  return { user };
}

module.exports = { login, refresh, logout, createStaffUser };
