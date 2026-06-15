/**
 * Creates (or updates) the admin user.
 * Safe to re-run — uses upsert, won't duplicate.
 *
 * Usage:
 *   node apps/api/scripts/seed-admin.js
 *
 * Override defaults with env vars:
 *   ADMIN_PHONE=08099999999 ADMIN_PASSWORD=Secret123! node apps/api/scripts/seed-admin.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paypoint';

const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Super';
const ADMIN_LAST_NAME  = process.env.ADMIN_LAST_NAME  || 'Admin';
const ADMIN_PHONE      = process.env.ADMIN_PHONE      || '08000000000';
const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      || 'admin@paypoint.ng';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || 'Admin@12345';

async function seed() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✔ MongoDB connected');

  // Inline schema — avoid importing model files that need full env setup
  const userSchema = new mongoose.Schema(
    {
      firstName: String,
      lastName: String,
      email: { address: String, verified: Boolean, verifiedAt: Date },
      phone: { number: String, verified: Boolean, verifiedAt: Date },
      passwordHash: String,
      pinHash: String,
      role: String,
      status: String,
      referralCode: String,
      twoFactorEnabled: Boolean,
    },
    { timestamps: true }
  );

  const walletSchema = new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,
      balance: { type: Number, default: 0 },
      currency: { type: String, default: 'NGN' },
      tier: { type: String, default: 'premium' },
      dailySpendLimit: { type: Number, default: 0 },
      weeklySpendLimit: { type: Number, default: 0 },
      totalFunded: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      frozenAmount: { type: Number, default: 0 },
    },
    { timestamps: true }
  );

  // Use existing models if already registered (idempotent)
  const User   = mongoose.models.User   || mongoose.model('User',   userSchema);
  const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Upsert by phone
  const user = await User.findOneAndUpdate(
    { 'phone.number': ADMIN_PHONE },
    {
      $set: {
        firstName: ADMIN_FIRST_NAME,
        lastName:  ADMIN_LAST_NAME,
        'email.address':  ADMIN_EMAIL,
        'email.verified': true,
        'email.verifiedAt': new Date(),
        'phone.number':   ADMIN_PHONE,
        'phone.verified': true,
        'phone.verifiedAt': new Date(),
        passwordHash,
        role:   'admin',
        status: 'active',
        twoFactorEnabled: false,
      },
      $setOnInsert: {
        referralCode: 'ADMIN' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      },
    },
    { upsert: true, new: true }
  );

  // Ensure wallet exists
  await Wallet.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id, tier: 'premium' } },
    { upsert: true }
  );

  console.log('');
  console.log('✔ Admin user ready');
  console.log('  Name    :', ADMIN_FIRST_NAME, ADMIN_LAST_NAME);
  console.log('  Phone   :', ADMIN_PHONE);
  console.log('  Email   :', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);
  console.log('  Role    : admin');
  console.log('');
  console.log('  → Open http://localhost:3000/login and sign in with the phone + password above.');
  console.log('  → Then navigate to http://localhost:3000/admin');
  console.log('');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
