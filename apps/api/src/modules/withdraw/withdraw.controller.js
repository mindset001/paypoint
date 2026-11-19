const service = require('./withdraw.service');
const { success, error } = require('../../utils/response');

const getBanks = async (req, res, next) => {
  try {
    const data = await service.getBanks();
    return success(res, data, 'Banks fetched');
  } catch (err) { next(err); }
};

const verifyAccount = async (req, res, next) => {
  try {
    const { bankCode, accountNumber } = req.body;
    if (!bankCode || !accountNumber) return error(res, 'bankCode and accountNumber are required', 400);
    const data = await service.verifyAccount(bankCode, accountNumber);
    return success(res, data, 'Account verified');
  } catch (err) { next(err); }
};

const addBankAccount = async (req, res, next) => {
  try {
    const { bankCode, bankName, accountNumber } = req.body;
    if (!bankCode || !bankName || !accountNumber) return error(res, 'bankCode, bankName and accountNumber are required', 400);
    const data = await service.addBankAccount(req.user._id, { bankCode, bankName, accountNumber });
    return success(res, data, 'Bank account saved', 201);
  } catch (err) { next(err); }
};

const getBankAccounts = async (req, res, next) => {
  try {
    const data = await service.getBankAccounts(req.user._id);
    return success(res, data, 'Bank accounts fetched');
  } catch (err) { next(err); }
};

const deleteBankAccount = async (req, res, next) => {
  try {
    const data = await service.deleteBankAccount(req.user._id, req.params.id);
    return success(res, data, 'Bank account removed');
  } catch (err) { next(err); }
};

const withdraw = async (req, res, next) => {
  try {
    const { bankAccountId, amount, pin } = req.body;
    if (!bankAccountId || !amount || !pin) return error(res, 'bankAccountId, amount and pin are required', 400);
    const data = await service.withdraw(req.user._id, { bankAccountId, amountNGN: parseFloat(amount), pin });
    return success(res, data, 'Withdrawal initiated');
  } catch (err) { next(err); }
};

module.exports = { getBanks, verifyAccount, addBankAccount, getBankAccounts, deleteBankAccount, withdraw };
