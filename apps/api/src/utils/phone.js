// Nigerian phone numbers get typed in at least three equivalent forms —
// +2348160071243, 2348160071243, 08160071243 — and nothing in this app
// normalizes them at write time, so whichever form a user registered with
// is whatever's sitting in `phone.number`. Rather than migrate existing
// data, every lookup-by-phone (login, password/PIN reset, wallet-transfer
// recipient, etc.) should match any of these forms instead of the literal
// stored string.

// Reduces any of the three forms down to the bare 10-digit national
// number (no leading 0, no 234/+234) so they can be compared.
const toNsn = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('234')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
};

// All the forms a given number might be stored as. Falls back to the
// original raw value alone if it doesn't look like a recognizable
// Nigerian number, so non-NG test data still matches itself exactly.
const phoneVariants = (raw) => {
  const nsn = toNsn(raw);
  if (nsn.length !== 10) return [raw];
  return [`0${nsn}`, `234${nsn}`, `+234${nsn}`];
};

module.exports = { toNsn, phoneVariants };
