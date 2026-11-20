'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, PiggyBank, Lock, LockOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { savingsApi } from '@/lib/api';
import { getErrorMessage, formatNGN, formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';

const DURATIONS = [
  { label: '1 Week', days: 7 },
  { label: '1 Month', days: 30 },
  { label: '2 Months', days: 60 },
];

interface SavingsLock {
  id: string;
  name: string;
  amount: number;
  status: 'active' | 'withdrawn';
  startDate: string;
  maturityDate: string;
  withdrawnAt?: string;
  isMatured: boolean;
}

interface LockForm { name: string; amount: string }

export default function SavingsPage() {
  const router = useRouter();
  const [locks, setLocks] = useState<SavingsLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [duration, setDuration] = useState(30);
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState<LockForm | null>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LockForm>();

  const [topUpTarget, setTopUpTarget] = useState<SavingsLock | null>(null);
  const [topUpShowPin, setTopUpShowPin] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [toppingUp, setToppingUp] = useState(false);

  const load = () => {
    setLoading(true);
    savingsApi.list()
      .then(({ data }) => setLocks(data.data || []))
      .catch(() => setLocks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalLocked = locks.filter((l) => l.status === 'active').reduce((sum, l) => sum + l.amount, 0);

  const onSubmit = (data: LockForm) => {
    setFormData(data);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!formData) return;
    setCreating(true);
    try {
      await savingsApi.create(formData.name, parseFloat(formData.amount), duration, pin);
      toast.success(`₦${formData.amount} locked for ${duration} days!`);
      setShowNew(false);
      setShowPin(false);
      reset();
      setDuration(30);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally {
      setCreating(false);
    }
  };

  const cancelTopUp = () => {
    setTopUpTarget(null);
    setTopUpShowPin(false);
    setTopUpAmount('');
  };

  const submitTopUpAmount = () => {
    const amt = parseFloat(topUpAmount);
    if (!amt || amt < 1000) { toast.error('Minimum top-up is ₦1,000'); return; }
    setTopUpShowPin(true);
  };

  const handleTopUpPinComplete = async (pin: string) => {
    if (!topUpTarget) return;
    setToppingUp(true);
    try {
      await savingsApi.topUp(topUpTarget.id, parseFloat(topUpAmount), pin);
      toast.success(`₦${topUpAmount} added to "${topUpTarget.name}"!`);
      cancelTopUp();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setTopUpShowPin(false);
    } finally {
      setToppingUp(false);
    }
  };

  const handleWithdraw = async (lock: SavingsLock) => {
    setWithdrawingId(lock.id);
    try {
      await savingsApi.withdraw(lock.id);
      toast.success(`₦${(lock.amount / 100).toLocaleString()} moved back to your wallet!`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-pink-500 to-pink-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Savings</h1>
        <p className="text-pink-100 text-sm">Lock money away for a goal</p>
        <div className="mt-4 bg-white/10 rounded-2xl p-4">
          <p className="text-pink-100 text-xs mb-1">Total Locked</p>
          <p className="text-white text-2xl font-black">{formatNGN(totalLocked)}</p>
        </div>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          {topUpTarget ? (
            !topUpShowPin ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-bold text-ink">Top Up &quot;{topUpTarget.name}&quot;</p>
                  <p className="text-xs text-ink-muted mt-1">Current balance: {formatNGN(topUpTarget.amount)}</p>
                </div>
                <Input
                  label="Amount to add (₦)"
                  placeholder="Enter amount"
                  type="number"
                  min={1000}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
                <p className="text-xs text-ink-muted bg-surface-2 rounded-xl p-3">
                  This adds to the existing lock — the unlock date stays {formatDate(topUpTarget.maturityDate)}.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" fullWidth onClick={cancelTopUp}>Cancel</Button>
                  <Button type="button" fullWidth onClick={submitTopUpAmount}>Continue</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="text-center mb-2">
                  <p className="text-ink-muted text-sm">Adding <strong>₦{topUpAmount}</strong> to</p>
                  <p className="font-bold text-ink">&quot;{topUpTarget.name}&quot;</p>
                </div>
                <PinInput length={4} onComplete={handleTopUpPinComplete} label="Enter Transaction PIN" />
                {toppingUp && <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />}
                <button onClick={() => setTopUpShowPin(false)} className="text-sm text-ink-muted underline">Go back</button>
              </div>
            )
          ) : !showNew ? (
            <>
              <Button fullWidth size="lg" onClick={() => setShowNew(true)}>
                <span className="flex items-center gap-2"><Plus size={18} /> New Savings Lock</span>
              </Button>

              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : locks.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-2 py-8">
                  <PiggyBank size={40} className="text-pink-300" />
                  <p className="text-ink-muted text-sm">No savings locks yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {locks.map((lock) => (
                    <div key={lock.id} className="border border-line rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-ink">{lock.name}</p>
                          <p className="text-xl font-black text-pink-600 mt-0.5">{formatNGN(lock.amount)}</p>
                        </div>
                        <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                          lock.status === 'withdrawn' ? 'bg-surface-2 text-ink-muted'
                            : lock.isMatured ? 'bg-green-50 dark:bg-green-500/15 text-green-600'
                            : 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600')}>
                          {lock.status === 'withdrawn' ? <LockOpen size={12} /> : <Lock size={12} />}
                          {lock.status === 'withdrawn' ? 'Withdrawn' : lock.isMatured ? 'Matured' : 'Locked'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">
                        {lock.status === 'withdrawn'
                          ? `Withdrawn ${formatDate(lock.withdrawnAt!)}`
                          : lock.isMatured
                            ? `Matured on ${formatDate(lock.maturityDate)}`
                            : `Unlocks ${formatDate(lock.maturityDate)}`}
                      </p>
                      {lock.status === 'active' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" fullWidth onClick={() => setTopUpTarget(lock)}>
                            Top Up
                          </Button>
                          {lock.isMatured && (
                            <Button
                              size="sm"
                              fullWidth
                              loading={withdrawingId === lock.id}
                              onClick={() => handleWithdraw(lock)}
                            >
                              Withdraw to Wallet
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : !showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="What's this for?"
                placeholder="e.g. School fees, Rent, Vacation"
                error={errors.name?.message}
                {...register('name', { required: 'Give this lock a name' })}
              />
              <Input
                label="Amount (₦)"
                placeholder="Enter amount to lock"
                type="number"
                min={1000}
                error={errors.amount?.message}
                {...register('amount', { required: 'Amount is required', min: { value: 1000, message: 'Minimum ₦1,000' } })}
              />
              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">Lock Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <button type="button" key={d.days} onClick={() => setDuration(d.days)}
                      className={cn('py-2 rounded-xl text-xs font-bold border-2 transition-all',
                        duration === d.days ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400' : 'border-line text-ink-muted')}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-ink-muted bg-surface-2 rounded-xl p-3">
                This money will be locked and unavailable to spend until the duration ends. No early withdrawal.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit" fullWidth>Continue</Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-ink-muted text-sm">Locking <strong>₦{formData?.amount}</strong> for</p>
                <p className="font-bold text-ink">{duration} days — &quot;{formData?.name}&quot;</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {creating && <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-ink-muted underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
