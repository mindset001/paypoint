// One-time migration: makes the User.phone.number unique index sparse, so
// multiple accounts with no phone number (Google sign-ups — see
// auth.service.js#googleAuth) can coexist. Without this, the second such
// account would hit a duplicate-key error since MongoDB's default unique
// index treats every "missing" value as the same null.
//
// Safe to run anytime — doesn't touch any existing user data, only the
// index definition. Run once, from apps/api:
//   node scripts/migrate-phone-index-sparse.js
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('users');

  const before = await coll.indexes();
  const existing = before.find((i) => i.name === 'phone.number_1');
  if (existing?.sparse) {
    console.log('Already sparse — nothing to do.');
  } else {
    if (existing) await coll.dropIndex('phone.number_1');
    await coll.createIndex({ 'phone.number': 1 }, { unique: true, sparse: true, name: 'phone.number_1' });
    console.log('phone.number_1 index recreated with sparse: true');
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
