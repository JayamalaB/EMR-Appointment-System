const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('0123456789', 8);

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Human-friendly search across name/mobile/patientId.
patientSchema.index({ name: 'text', mobile: 'text', patientId: 'text' });

patientSchema.pre('validate', function assignPatientId(next) {
  if (!this.patientId) {
    this.patientId = `PT${nanoid()}`;
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
