const mongoose = require('mongoose');
const Transaction = require('../../../models/Transaction');

// Distinct phone numbers this user has bought airtime/data for before,
// most-recent first — spans both types since people usually buy for the
// same numbers (self, family) regardless of airtime vs data.
const getRecentNumbers = async (userId, limit = 8) => {
  const User = require('../../../models/User');

  const recent = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: { $in: ['airtime', 'data'] }, status: { $in: ['success', 'pending'] } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$meta.phone', network: { $first: '$meta.network' }, lastUsedAt: { $first: '$createdAt' } } },
    { $match: { _id: { $ne: null } } },
    { $sort: { lastUsedAt: -1 } },
    { $limit: limit },
  ]);

  const user = await User.findById(userId).select('phone.number');
  const ownNumber = user?.phone?.number;

  return recent.map((r) => ({
    phone: r._id,
    network: r.network,
    isSelf: r._id === ownNumber,
  }));
};

module.exports = { getRecentNumbers };
