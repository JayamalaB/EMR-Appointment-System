/**
 * Centralized environment configuration.
 *
 * All process.env access in the app goes through this module so that:
 *  - required variables are validated once, at boot, instead of failing
 *    unpredictably deep inside a request handler
 *  - the rest of the codebase depends on a typed/shaped config object
 *    instead of sprinkling `process.env.X` everywhere
 */
require('dotenv').config();

const REQUIRED_IN_PRODUCTION = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/emr_appointments',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  },

  seed: {
    superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@emr.local',
    superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe123!',
  },
};

function validateEnv() {
  if (env.nodeEnv === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(', ')}`
      );
    }
  }
}

validateEnv();

module.exports = env;
