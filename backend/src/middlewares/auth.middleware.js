const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

/**
 * Verifies the JWT access token sent as `Authorization: Bearer <token>`,
 * loads the user, and attaches it to `req.user`. All protected routes
 * depend on this running first.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or malformed access token');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists or is inactive');
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    doctorProfile: user.doctorProfile ? user.doctorProfile.toString() : null,
    email: user.email,
    name: user.name,
  };
  next();
});

module.exports = { authenticate };
