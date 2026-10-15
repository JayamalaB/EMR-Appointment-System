const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

/**
 * Fire-and-forget audit logging. We intentionally never let an audit write
 * failure break the primary request - logging a failure to log is enough.
 */
async function record({ user, action, entity, entityId = null, metadata = {}, ip = '' }) {
  try {
    await AuditLog.create({
      user: user.id,
      role: user.role,
      action,
      entity,
      entityId,
      metadata,
      ip,
    });
  } catch (err) {
    logger.error(`Audit log write failed: ${err.message}`);
  }
}

module.exports = { record };
