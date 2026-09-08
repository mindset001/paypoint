const Setting = require('../models/Setting');

const get = async (key, fallback = null) => {
  const doc = await Setting.findOne({ key });
  return doc ? doc.value : fallback;
};

const set = async (key, value) => {
  const doc = await Setting.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true }
  );
  return doc.value;
};

module.exports = { get, set };
