const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },
    // Only populated when role === 'doctor'. Kept as a reference rather
    // than embedding doctor-specific fields on User, so User stays a pure
    // auth/identity document and doctor profile data can evolve
    // independently (specialization, department, schedule, etc.).
    doctorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plainText) {
  return bcrypt.hash(plainText, 12);
};

// Never leak the hash even if a stray query forgets to .select('-passwordHash').
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
