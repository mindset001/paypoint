const crypto = require('crypto');
const AjoPlan = require('../../models/AjoPlan');
const AjoContribution = require('../../models/AjoContribution');
const AjoPayout = require('../../models/AjoPayout');
const Wallet = require('../../models/Wallet');
const notify = require('../notifications/notifications.service');

const MIN_AMOUNT_KOBO = 50000; // ₦500 per contribution
const MIN_GROUP_SLOTS = 2;
const MAX_GROUP_SLOTS = 20;
const MIN_SOLO_CYCLES = 2;
const MAX_SOLO_CYCLES = 104;

const generateInviteCode = async () => {
  let code;
  do {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // eslint-disable-next-line no-await-in-loop
  } while (await AjoPlan.findOne({ inviteCode: code }));
  return code;
};

// Native Date arithmetic — no date library in this project. `monthly` uses
// setMonth (accepted JS edge-case behavior on month-end dates, fine for a
// recurring contribution reminder, not a legal/financial settlement date).
const addInterval = (date, frequency, intervalDays) => {
  const d = new Date(date);
  if (frequency === 'daily') { d.setDate(d.getDate() + 1); return d; }
  if (frequency === 'weekly') { d.setDate(d.getDate() + 7); return d; }
  if (frequency === 'monthly') { d.setMonth(d.getMonth() + 1); return d; }
  d.setDate(d.getDate() + (intervalDays || 1)); // custom
  return d;
};

const fisherYatesShuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const sanitizePlan = (plan, extra = {}) => ({
  id: plan._id,
  creatorId: plan.creatorId,
  name: plan.name,
  mode: plan.mode,
  frequency: plan.frequency,
  intervalDays: plan.intervalDays,
  amountKobo: plan.amountKobo,
  totalSlots: plan.totalSlots,
  totalCycles: plan.totalCycles,
  inviteCode: plan.inviteCode,
  status: plan.status,
  members: plan.members,
  rotationOrder: plan.rotationOrder,
  currentCycle: plan.currentCycle,
  nextDueDate: plan.nextDueDate,
  startedAt: plan.startedAt,
  completedAt: plan.completedAt,
  createdAt: plan.createdAt,
  ...extra,
});

const createPlan = async (userId, { name, mode, frequency, intervalDays, amountNGN, totalSlots, totalCycles }) => {
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw Object.assign(new Error('Give this plan a name'), { statusCode: 400 });
  if (!['solo', 'group'].includes(mode)) throw Object.assign(new Error('mode must be solo or group'), { statusCode: 400 });
  if (!['daily', 'weekly', 'monthly', 'custom'].includes(frequency)) {
    throw Object.assign(new Error('Invalid frequency'), { statusCode: 400 });
  }
  if (frequency === 'custom') {
    const days = parseInt(intervalDays, 10);
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw Object.assign(new Error('Custom interval must be between 1 and 90 days'), { statusCode: 400 });
    }
  }

  const amountKobo = Math.round(parseFloat(amountNGN) * 100);
  if (!Number.isFinite(amountKobo) || amountKobo < MIN_AMOUNT_KOBO) {
    throw Object.assign(new Error(`Minimum contribution is ₦${(MIN_AMOUNT_KOBO / 100).toLocaleString()}`), { statusCode: 400 });
  }

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });

  if (mode === 'solo') {
    const cycles = parseInt(totalCycles, 10);
    if (!Number.isFinite(cycles) || cycles < MIN_SOLO_CYCLES || cycles > MAX_SOLO_CYCLES) {
      throw Object.assign(new Error(`Number of contributions must be between ${MIN_SOLO_CYCLES} and ${MAX_SOLO_CYCLES}`), { statusCode: 400 });
    }

    const nextDueDate = addInterval(new Date(), frequency, intervalDays);
    const plan = await AjoPlan.create({
      creatorId: userId, name: trimmedName, mode: 'solo', frequency, intervalDays,
      amountKobo, totalSlots: 1, totalCycles: cycles,
      status: 'active', members: [{ userId, joinedAt: new Date(), position: 0 }],
      currentCycle: 1, nextDueDate, startedAt: new Date(),
    });

    await AjoContribution.create({ planId: plan._id, cycleNumber: 1, userId, amountKobo });

    notify.createNotification(userId, {
      title: 'Ajo Plan Started 🎯',
      body: `"${trimmedName}" is live — ₦${(amountKobo / 100).toLocaleString()} will be auto-charged every ${frequency === 'custom' ? `${intervalDays} days` : frequency}, no PIN prompt. First charge: ${nextDueDate.toDateString()}.`,
      type: 'wallet', meta: { ajoPlanId: plan._id },
    });

    return sanitizePlan(plan);
  }

  // group
  const slots = parseInt(totalSlots, 10);
  if (!Number.isFinite(slots) || slots < MIN_GROUP_SLOTS || slots > MAX_GROUP_SLOTS) {
    throw Object.assign(new Error(`Group size must be between ${MIN_GROUP_SLOTS} and ${MAX_GROUP_SLOTS}`), { statusCode: 400 });
  }

  const inviteCode = await generateInviteCode();
  const plan = await AjoPlan.create({
    creatorId: userId, name: trimmedName, mode: 'group', frequency, intervalDays,
    amountKobo, totalSlots: slots, totalCycles: slots, inviteCode,
    status: 'forming', members: [{ userId, joinedAt: new Date(), position: 0 }],
  });

  return sanitizePlan(plan);
};

const joinPlan = async (userId, inviteCode) => {
  const code = (inviteCode || '').trim().toUpperCase();
  if (!code) throw Object.assign(new Error('Invite code is required'), { statusCode: 400 });

  const plan = await AjoPlan.findOne({ inviteCode: code });
  if (!plan) throw Object.assign(new Error('Invalid invite code'), { statusCode: 404 });
  if (plan.status !== 'forming') {
    throw Object.assign(new Error('This group has already started and is no longer accepting new members'), { statusCode: 400 });
  }
  if (plan.members.some((m) => m.userId.toString() === userId.toString())) {
    throw Object.assign(new Error('You are already in this group'), { statusCode: 400 });
  }
  if (plan.members.length >= plan.totalSlots) {
    throw Object.assign(new Error('This group is already full'), { statusCode: 400 });
  }

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });

  plan.members.push({ userId, joinedAt: new Date() });
  await plan.save();

  notify.createNotification(plan.creatorId, {
    title: 'New Ajo Member',
    body: `Someone just joined "${plan.name}" (${plan.members.length}/${plan.totalSlots} slots filled).`,
    type: 'wallet', meta: { ajoPlanId: plan._id },
  });

  return sanitizePlan(plan);
};

const startPlan = async (userId, planId) => {
  const plan = await AjoPlan.findOne({ _id: planId, mode: 'group' });
  if (!plan) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
  if (plan.creatorId.toString() !== userId.toString()) {
    throw Object.assign(new Error('Only the creator can start this group'), { statusCode: 403 });
  }
  if (plan.status !== 'forming') throw Object.assign(new Error('This group has already started'), { statusCode: 400 });
  if (plan.members.length < MIN_GROUP_SLOTS) {
    throw Object.assign(new Error(`Need at least ${MIN_GROUP_SLOTS} members to start`), { statusCode: 400 });
  }

  const memberIds = plan.members.map((m) => m.userId);
  const rotationOrder = fisherYatesShuffle(memberIds);
  rotationOrder.forEach((uid, idx) => {
    const member = plan.members.find((m) => m.userId.toString() === uid.toString());
    if (member) member.position = idx;
  });

  const nextDueDate = addInterval(new Date(), plan.frequency, plan.intervalDays);
  plan.rotationOrder = rotationOrder;
  plan.totalCycles = memberIds.length;
  plan.currentCycle = 1;
  plan.nextDueDate = nextDueDate;
  plan.startedAt = new Date();
  plan.status = 'active';
  await plan.save();

  await AjoContribution.create(
    memberIds.map((uid) => ({ planId: plan._id, cycleNumber: 1, userId: uid, amountKobo: plan.amountKobo }))
  );

  const freqLabel = plan.frequency === 'custom' ? `${plan.intervalDays} days` : plan.frequency;
  await Promise.all(memberIds.map((uid, idx) => notify.createNotification(uid, {
    title: 'Ajo Group Started 🎉',
    body: `"${plan.name}" has started! You're #${idx + 1} in the payout order. ₦${(plan.amountKobo / 100).toLocaleString()} will be auto-charged every ${freqLabel}, no PIN prompt. First charge: ${nextDueDate.toDateString()}.`,
    type: 'wallet', meta: { ajoPlanId: plan._id },
  })));

  return sanitizePlan(plan);
};

const cancelPlan = async (userId, planId) => {
  const plan = await AjoPlan.findById(planId);
  if (!plan) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
  if (plan.creatorId.toString() !== userId.toString()) {
    throw Object.assign(new Error('Only the creator can cancel this plan'), { statusCode: 403 });
  }
  if (plan.status !== 'forming') {
    throw Object.assign(new Error('Only a plan that has not started yet can be cancelled'), { statusCode: 400 });
  }
  plan.status = 'cancelled';
  await plan.save();
  return sanitizePlan(plan);
};

const forceSettle = async (userId, planId, contributionId) => {
  const plan = await AjoPlan.findById(planId);
  if (!plan) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
  if (plan.creatorId.toString() !== userId.toString()) {
    throw Object.assign(new Error('Only the creator can do this'), { statusCode: 403 });
  }
  if (plan.status !== 'active') throw Object.assign(new Error('Plan is not active'), { statusCode: 400 });

  const contribution = await AjoContribution.findOne({ _id: contributionId, planId: plan._id, cycleNumber: plan.currentCycle });
  if (!contribution) throw Object.assign(new Error('Contribution not found for the current cycle'), { statusCode: 404 });
  if (contribution.status !== 'pending') throw Object.assign(new Error('This contribution is already settled'), { statusCode: 400 });

  contribution.status = 'forced';
  await contribution.save();

  return { id: contribution._id, status: contribution.status };
};

const listMyPlans = async (userId) => {
  const plans = await AjoPlan.find({ 'members.userId': userId }).sort({ createdAt: -1 });
  return plans.map((p) => sanitizePlan(p));
};

const getPlan = async (userId, planId) => {
  const plan = await AjoPlan.findById(planId);
  if (!plan || !plan.members.some((m) => m.userId.toString() === userId.toString())) {
    throw Object.assign(new Error('Plan not found'), { statusCode: 404 });
  }

  const [contributions, payouts] = await Promise.all([
    AjoContribution.find({ planId: plan._id }).sort({ cycleNumber: 1 }),
    AjoPayout.find({ planId: plan._id }).sort({ cycleNumber: 1 }),
  ]);

  return sanitizePlan(plan, {
    isCreator: plan.creatorId.toString() === userId.toString(),
    currentCycleContributions: contributions.filter((c) => c.cycleNumber === plan.currentCycle),
    contributions,
    payouts,
  });
};

module.exports = {
  MIN_AMOUNT_KOBO, MIN_GROUP_SLOTS, MAX_GROUP_SLOTS, MIN_SOLO_CYCLES, MAX_SOLO_CYCLES,
  addInterval, fisherYatesShuffle,
  createPlan, joinPlan, startPlan, cancelPlan, forceSettle, listMyPlans, getPlan,
};
