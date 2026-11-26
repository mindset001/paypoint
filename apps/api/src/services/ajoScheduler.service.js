const mongoose = require('mongoose');
const AjoPlan = require('../models/AjoPlan');
const AjoContribution = require('../models/AjoContribution');
const AjoPayout = require('../models/AjoPayout');
const Transaction = require('../models/Transaction');
const walletService = require('../modules/wallet/wallet.service');
const ledger = require('./ledger.service');
const notify = require('../modules/notifications/notifications.service');
const otp = require('../utils/otp');
const { addInterval } = require('../modules/ajo/ajo.service');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ngn = (kobo) => `₦${(kobo / 100).toLocaleString()}`;

// ── Reminders ──────────────────────────────────────────────────────────
// At most one reminder per contribution per calendar day (gated by
// reminderSentAt). Wording changes based on how close/overdue the due date is.
const sendReminders = async () => {
  const now = Date.now();
  const activePlans = await AjoPlan.find({ status: 'active' });

  for (const plan of activePlans) {
    if (!plan.nextDueDate) continue;
    const dueInMs = plan.nextDueDate.getTime() - now;
    if (dueInMs > ONE_DAY_MS) continue; // not due within 24h yet

    // eslint-disable-next-line no-await-in-loop
    const pending = await AjoContribution.find({
      planId: plan._id,
      cycleNumber: plan.currentCycle,
      status: 'pending',
      $or: [{ reminderSentAt: null }, { reminderSentAt: { $lt: new Date(now - ONE_DAY_MS) } }],
    });

    for (const contribution of pending) {
      let body;
      if (dueInMs > 0) {
        body = `Your ${ngn(plan.amountKobo)} contribution for "${plan.name}" is due ${dueInMs > 12 * 60 * 60 * 1000 ? 'tomorrow' : 'today'}. Fund your wallet so it can be auto-collected.`;
      } else {
        body = `Your ${ngn(plan.amountKobo)} contribution for "${plan.name}" is overdue — the group's payout is on hold until everyone pays. Fund your wallet now.`;
      }

      // eslint-disable-next-line no-await-in-loop
      await notify.createNotification(contribution.userId, {
        title: dueInMs > 0 ? 'Ajo Contribution Due' : 'Ajo Contribution Overdue',
        body, type: 'wallet', meta: { ajoPlanId: plan._id, cycle: plan.currentCycle },
      });
      contribution.reminderSentAt = new Date(now);
      // eslint-disable-next-line no-await-in-loop
      await contribution.save();
    }
  }
};

// ── Collection ─────────────────────────────────────────────────────────
// For every plan whose due date has arrived, attempt to auto-debit each
// still-pending contributor. Insufficient balance is left pending — it's
// retried on every subsequent tick until paid or force-settled.
const collectDue = async () => {
  const duePlans = await AjoPlan.find({ status: 'active', nextDueDate: { $lte: new Date() } });

  for (const plan of duePlans) {
    // eslint-disable-next-line no-await-in-loop
    const pending = await AjoContribution.find({ planId: plan._id, cycleNumber: plan.currentCycle, status: 'pending' });

    for (const contribution of pending) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const { wallet, balanceBefore, balanceAfter } = await walletService.debit(contribution.userId, contribution.amountKobo, session);

        const reference = otp.generateRef();
        const [tx] = await Transaction.create([{
          reference, userId: contribution.userId, walletId: wallet._id,
          type: 'ajo_contribution', direction: 'debit', amount: contribution.amountKobo, status: 'success',
          balanceBefore, balanceAfter,
          meta: { ajoPlanId: plan._id, ajoCycle: plan.currentCycle, narration: `Ajo contribution — "${plan.name}" (cycle ${plan.currentCycle})` },
          processedAt: new Date(),
        }], { session });

        await ledger.record({
          transactionId: tx._id, userId: contribution.userId, walletId: wallet._id, entry: 'debit',
          amount: contribution.amountKobo, balanceBefore, balanceAfter,
          description: `Ajo contribution: ${plan.name} (cycle ${plan.currentCycle})`,
        }, session);

        contribution.status = 'paid';
        contribution.paidAt = new Date();
        contribution.transactionId = tx._id;
        await contribution.save({ session });

        await session.commitTransaction();

        notify.createNotification(contribution.userId, {
          title: 'Ajo Contribution Collected ✓',
          body: `${ngn(contribution.amountKobo)} was contributed to "${plan.name}" (cycle ${plan.currentCycle}).`,
          type: 'wallet', meta: { ajoPlanId: plan._id, cycle: plan.currentCycle },
        });
      } catch (err) {
        // eslint-disable-next-line no-await-in-loop
        await session.abortTransaction();
        // Insufficient balance (or any other failure) — leave pending, retried next tick.
        if (err.statusCode !== 402) {
          console.error(`[ajo-scheduler] collection failed for plan ${plan._id} user ${contribution.userId}:`, err.message);
        }
      } finally {
        session.endSession();
      }
    }
  }
};

// ── Cycle advance / payout ──────────────────────────────────────────────
// Once every contribution for the current cycle is settled (paid or
// force-settled), either pay out (group) or just roll forward (solo, which
// only pays out on its very last cycle).
const advanceCycles = async () => {
  const activePlans = await AjoPlan.find({ status: 'active' });

  for (const plan of activePlans) {
    // eslint-disable-next-line no-await-in-loop
    const cycleContributions = await AjoContribution.find({ planId: plan._id, cycleNumber: plan.currentCycle });
    if (cycleContributions.length === 0) continue;
    const allSettled = cycleContributions.every((c) => c.status === 'paid' || c.status === 'forced');
    if (!allSettled) continue;

    const potKobo = cycleContributions.reduce((sum, c) => sum + c.amountKobo, 0);
    const isFinalCycle = plan.currentCycle >= plan.totalCycles;

    if (plan.mode === 'group') {
      // eslint-disable-next-line no-await-in-loop
      await payoutCycle(plan, potKobo, plan.rotationOrder[plan.currentCycle - 1]);
    } else if (isFinalCycle) {
      // Solo: the pot has been accumulating across every prior cycle's own
      // AjoPayout-less contributions — release the running total now.
      // eslint-disable-next-line no-await-in-loop
      const priorContributions = await AjoContribution.find({ planId: plan._id, status: { $in: ['paid', 'forced'] } });
      const totalKobo = priorContributions.reduce((sum, c) => sum + c.amountKobo, 0);
      // eslint-disable-next-line no-await-in-loop
      await payoutCycle(plan, totalKobo, plan.creatorId);
    }

    if (isFinalCycle) {
      plan.status = 'completed';
      plan.completedAt = new Date();
      // eslint-disable-next-line no-await-in-loop
      await plan.save();

      const memberIds = plan.members.map((m) => m.userId);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(memberIds.map((uid) => notify.createNotification(uid, {
        title: 'Ajo Plan Completed 🏁',
        body: `"${plan.name}" has completed its full rotation. Thanks for contributing!`,
        type: 'wallet', meta: { ajoPlanId: plan._id },
      })));
      continue;
    }

    plan.currentCycle += 1;
    plan.nextDueDate = addInterval(plan.nextDueDate, plan.frequency, plan.intervalDays);
    // eslint-disable-next-line no-await-in-loop
    await plan.save();

    const memberIds = plan.members.map((m) => m.userId);
    // eslint-disable-next-line no-await-in-loop
    await AjoContribution.create(
      memberIds.map((uid) => ({ planId: plan._id, cycleNumber: plan.currentCycle, userId: uid, amountKobo: plan.amountKobo }))
    );
  }
};

const payoutCycle = async (plan, amountKobo, recipientUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { wallet, balanceBefore, balanceAfter } = await walletService.credit(recipientUserId, amountKobo, session);

    const reference = otp.generateRef();
    const [tx] = await Transaction.create([{
      reference, userId: recipientUserId, walletId: wallet._id,
      type: 'ajo_payout', direction: 'credit', amount: amountKobo, status: 'success',
      balanceBefore, balanceAfter,
      meta: { ajoPlanId: plan._id, ajoCycle: plan.currentCycle, narration: `Ajo payout — "${plan.name}" (cycle ${plan.currentCycle})` },
      processedAt: new Date(),
    }], { session });

    await ledger.record({
      transactionId: tx._id, userId: recipientUserId, walletId: wallet._id, entry: 'credit',
      amount: amountKobo, balanceBefore, balanceAfter,
      description: `Ajo payout: ${plan.name} (cycle ${plan.currentCycle})`,
    }, session);

    await AjoPayout.create([{
      planId: plan._id, cycleNumber: plan.currentCycle, recipientUserId,
      amountKobo, status: 'paid', paidAt: new Date(), transactionId: tx._id,
    }], { session });

    await session.commitTransaction();

    notify.createNotification(recipientUserId, {
      title: plan.mode === 'solo' ? 'Ajo Savings Released 💰' : 'Ajo Payout Received 💸',
      body: `${ngn(amountKobo)} from "${plan.name}" has been added to your wallet.`,
      type: 'wallet', meta: { ajoPlanId: plan._id, cycle: plan.currentCycle },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(`[ajo-scheduler] payout failed for plan ${plan._id}, cycle ${plan.currentCycle}:`, err.message);
    throw err;
  } finally {
    session.endSession();
  }
};

const tick = async () => {
  await sendReminders();
  await collectDue();
  await advanceCycles();
};

module.exports = { tick, sendReminders, collectDue, advanceCycles };
