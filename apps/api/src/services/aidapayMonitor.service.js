const AidaPay = require('../providers/aidapay/aidapay.client');
const settings = require('./settings.service');
const emailService = require('./email.service');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Matches the admin dashboard's own low-balance threshold (admin/page.tsx) —
// below this, live VTU purchases start failing provider-side.
const LOW_BALANCE_KOBO = 500000; // ₦5,000
const ALERTED_FLAG_KEY = 'aidapay_low_balance_alerted';

// Fans out a popup notification + best-effort email to every admin —
// mirrors admin.service.js#sendAnnouncement's delivery pattern, but this
// is system-triggered rather than admin-composed.
const alertAdmins = async (balanceKobo) => {
  const admins = await User.find(
    { role: { $in: ['admin', 'developer'] }, status: { $ne: 'suspended' } },
    'email'
  );
  if (!admins.length) return;

  const title = 'AidaPay balance is low';
  const balanceStr = `₦${(balanceKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  const body = `The AidaPay provider wallet is down to ${balanceStr}. Fund it soon or live VTU purchases will start failing.`;

  await Notification.insertMany(
    admins.map((a) => ({
      userId: a._id,
      title,
      body,
      type: 'system',
      meta: { aidapayLowBalance: true, displayType: 'popup' },
    }))
  );

  await Promise.all(
    admins
      .filter((a) => a.email?.address)
      .map((a) =>
        emailService
          .sendAlertEmail(a.email.address, { subject: title, heading: title, message: body })
          .catch((err) => console.error(`[aidapay-monitor] failed to email ${a.email.address}:`, err.message))
      )
  );
};

// Alerts once when balance first drops below the threshold, then stays
// quiet until it recovers above it — otherwise every 30-min check would
// re-alert admins who already know and haven't topped up yet.
const checkBalance = async () => {
  let balanceKobo;
  try {
    const res = await AidaPay.getAccountInfo();
    balanceKobo = Math.round((res.data?.data?.balance ?? 0) * 100);
  } catch (err) {
    console.error('[aidapay-monitor] failed to check balance:', err.message);
    return;
  }

  const alreadyAlerted = await settings.get(ALERTED_FLAG_KEY, false);

  if (balanceKobo < LOW_BALANCE_KOBO && !alreadyAlerted) {
    await alertAdmins(balanceKobo);
    await settings.set(ALERTED_FLAG_KEY, true);
  } else if (balanceKobo >= LOW_BALANCE_KOBO && alreadyAlerted) {
    await settings.set(ALERTED_FLAG_KEY, false);
  }
};

module.exports = { checkBalance, LOW_BALANCE_KOBO };
