const Ledger = require('../models/Ledger');

const record = async ({ transactionId, userId, walletId, entry, amount, balanceBefore, balanceAfter, description }, session) => {
  const opts = session ? { session } : {};
  await Ledger.create(
    [{ transactionId, userId, walletId, entry, amount, balanceBefore, balanceAfter, description }],
    opts
  );
};

module.exports = { record };
