const ApiError = require('../utils/ApiError');

/**
 * Role gate. Usage: router.get('/x', authenticate, authorize('super_admin'), handler)
 * Must run after `authenticate` so req.user is populated.
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { authorize };
