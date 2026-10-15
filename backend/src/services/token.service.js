const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

function parseExpiryToDate(expiresIn) {
  // supports "15m", "7d", "1h" style strings used by jsonwebtoken
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[match[2]];
  return new Date(Date.now() + value * unitMs);
}

/**
 * Issues a new refresh token (random, opaque - NOT a JWT, so it carries no
 * inspectable claims) and persists only its hash, so stealing the DB
 * doesn't hand out usable tokens. Returns the raw token to send to the
 * client and the DB record for reference.
 */
async function issueRefreshToken(user, { ip, userAgent } = {}) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = RefreshToken.hashToken(rawToken);
  const expiresAt = parseExpiryToDate(env.jwt.refreshExpiresIn);

  const record = await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    ip: ip || '',
    userAgent: userAgent || '',
  });

  return { rawToken, record };
}

/**
 * Validates a presented refresh token, rotates it (revokes the old one,
 * issues a new one), and returns both new tokens. Rotation means a stolen
 * refresh token can only be replayed once before the legitimate owner's
 * next refresh invalidates it (detectable reuse).
 */
async function rotateRefreshToken(rawToken, meta) {
  const tokenHash = RefreshToken.hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash }).populate('user');

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }

  const user = existing.user;
  if (!user || !user.isActive) return null;

  const { rawToken: newRawToken, record: newRecord } = await issueRefreshToken(user, meta);

  existing.revokedAt = new Date();
  existing.replacedByHash = newRecord.tokenHash;
  await existing.save();

  return { user, rawToken: newRawToken };
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = RefreshToken.hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

module.exports = {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
