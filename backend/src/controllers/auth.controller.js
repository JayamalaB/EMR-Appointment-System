const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../utils/constants');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function requestMeta(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] || '' };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password }, requestMeta(req));

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTS);

  await auditService.record({
    user: { id: result.user.id, role: result.user.role },
    action: AUDIT_ACTIONS.LOGIN,
    entity: 'User',
    entityId: result.user.id,
    ip: req.ip,
  });

  return new ApiResponse(200, 'Login successful', {
    accessToken: result.accessToken,
    user: result.user,
  }).send(res);
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  const result = await authService.refresh(token, requestMeta(req));

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTS);

  return new ApiResponse(200, 'Token refreshed', { accessToken: result.accessToken }).send(res);
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

  if (req.user) {
    await auditService.record({
      user: req.user,
      action: AUDIT_ACTIONS.LOGOUT,
      entity: 'User',
      entityId: req.user.id,
      ip: req.ip,
    });
  }

  return new ApiResponse(200, 'Logged out successfully').send(res);
});

const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, department, specialization } = req.body;
  const role = req.params.role; // 'doctor' | 'receptionist'

  const result = await authService.createStaffUser({
    name,
    email,
    password,
    role,
    department,
    specialization,
    createdBy: req.user.id,
  });

  await auditService.record({
    user: req.user,
    action: role === 'doctor' ? AUDIT_ACTIONS.DOCTOR_CREATED : AUDIT_ACTIONS.RECEPTIONIST_CREATED,
    entity: 'User',
    entityId: result.user._id,
    ip: req.ip,
  });

  return new ApiResponse(201, `${role} created successfully`, result).send(res);
});

module.exports = { login, refresh, logout, createStaff };
