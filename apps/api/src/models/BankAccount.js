const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bankCode: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },     // resolved from Paystack, never client-supplied
    recipientCode: { type: String, required: true },   // Paystack transfer recipient code — reused per withdrawal
  },
  { timestamps: true }
);

bankAccountSchema.index({ userId: 1, accountNumber: 1, bankCode: 1 }, { unique: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
