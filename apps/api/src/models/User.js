const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      address: { type: String, unique: true, lowercase: true, trim: true },
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },
    phone: {
      number: { type: String, unique: true, trim: true },
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },
    passwordHash: { type: String, select: false },
    pinHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['customer', 'agent', 'sub_agent', 'admin', 'developer'],
      default: 'customer',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_kyc'],
      default: 'active',
    },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    twoFactorEnabled: { type: Boolean, default: false },
    lastLoginAt: Date,
    lastLoginIp: String,
  },
  { timestamps: true }
);

// unique:true fields already create indexes — only add non-unique compound index here
userSchema.index({ role: 1, status: 1 });

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.comparePin = async function (pin) {
  return bcrypt.compare(pin, this.pinHash);
};

userSchema.statics.hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

userSchema.statics.hashPin = async (pin) => {
  return bcrypt.hash(pin, 10);
};

module.exports = mongoose.model('User', userSchema);
