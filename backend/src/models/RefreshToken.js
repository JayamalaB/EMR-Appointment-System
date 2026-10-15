const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The raw refresh token is never stored - only a SHA-256 hash of it.
    // If the database were ever leaked, stored tokens could not be reused
    // directly (same principle as password hashing).
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null }, // rotation chain, for audit purposes
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically purges expired refresh token records,
// keeping the collection small without a manual cleanup job.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.hashToken = function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
