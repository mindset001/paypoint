const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  key:       { type: String, required: true, index: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date,   required: true, index: { expires: 0 } },
  payload:   { type: mongoose.Schema.Types.Mixed },
});

module.exports = mongoose.model('Otp', otpSchema);
