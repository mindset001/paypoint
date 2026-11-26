'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, User as UserIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ajoApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

const FREQUENCIES: { label: string; value: 'daily' | 'weekly' | 'monthly' | 'custom' }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom', value: 'custom' },
];

export default function NewAjoPlanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'solo' | 'group'>('solo');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [intervalDays, setIntervalDays] = useState('3');
  const [amount, setAmount] = useState('');
  const [totalSlots, setTotalSlots] = useState('3');
  const [totalCycles, setTotalCycles] = useState('12');
  const [submitting, setSubmitting] = useState(false);

  const frequencyLabel = frequency === 'custom' ? `every ${intervalDays || '—'} days` : frequency;

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('Give this plan a name');
    const amt = parseFloat(amount);
    if (!amt || amt < 500) return toast.error('Minimum contribution is ₦500');
    if (frequency === 'custom' && (!intervalDays || parseInt(intervalDays, 10) < 1)) {
      return toast.error('Enter a valid custom interval');
    }
    if (mode === 'group' && (parseInt(totalSlots, 10) < 2 || parseInt(totalSlots, 10) > 20)) {
      return toast.error('Group size must be between 2 and 20');
    }
    if (mode === 'solo' && (parseInt(totalCycles, 10) < 2 || parseInt(totalCycles, 10) > 104)) {
      return toast.error('Number of contributions must be between 2 and 104');
    }

    setSubmitting(true);
    try {
      const { data } = await ajoApi.create({
        name: name.trim(),
        mode,
        frequency,
        intervalDays: frequency === 'custom' ? parseInt(intervalDays, 10) : undefined,
        amount: amt,
        totalSlots: mode === 'group' ? parseInt(totalSlots, 10) : undefined,
        totalCycles: mode === 'solo' ? parseInt(totalCycles, 10) : undefined,
      });
      toast.success(mode === 'solo' ? 'Ajo plan started!' : 'Ajo group created — invite your friends!');
      router.replace(`/ajo/${data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">New Ajo Plan</h1>
        <p className="text-indigo-100 text-sm">Save alone, or take turns with friends</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('solo')}
              className={cn('flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all',
                mode === 'solo' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-line')}>
              <UserIcon size={22} className={mode === 'solo' ? 'text-indigo-600' : 'text-ink-muted'} />
              <span className={cn('text-sm font-bold', mode === 'solo' ? 'text-indigo-700 dark:text-indigo-400' : 'text-ink-muted')}>Solo</span>
            </button>
            <button type="button" onClick={() => setMode('group')}
              className={cn('flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all',
                mode === 'group' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-line')}>
              <Users size={22} className={mode === 'group' ? 'text-indigo-600' : 'text-ink-muted'} />
              <span className={cn('text-sm font-bold', mode === 'group' ? 'text-indigo-700 dark:text-indigo-400' : 'text-ink-muted')}>Group</span>
            </button>
          </div>

          <Input label="Plan name" placeholder="e.g. Rent Fund, Monthly Ajo" value={name} onChange={(e) => setName(e.target.value)} />

          <div>
            <label className="text-sm font-medium text-ink-muted mb-2 block">How often?</label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => (
                <button type="button" key={f.value} onClick={() => setFrequency(f.value)}
                  className={cn('py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    frequency === f.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-line text-ink-muted')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {frequency === 'custom' && (
            <Input label="Every how many days?" type="number" min={1} max={90} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
          )}

          <Input label="Amount per contribution (₦)" placeholder="Enter amount" type="number" min={500} value={amount} onChange={(e) => setAmount(e.target.value)} />

          {mode === 'group' ? (
            <Input label="Number of members (including you)" type="number" min={2} max={20} value={totalSlots} onChange={(e) => setTotalSlots(e.target.value)} />
          ) : (
            <Input label="Number of contributions" type="number" min={2} max={104} value={totalCycles} onChange={(e) => setTotalCycles(e.target.value)} />
          )}

          <p className="text-xs text-ink-muted bg-surface-2 rounded-xl p-3">
            {mode === 'solo'
              ? `₦${amount || '0'} will be auto-charged from your wallet ${frequencyLabel}, no PIN prompt — for ${totalCycles || '—'} rounds. The full amount is released back to your wallet when it completes.`
              : `Once started, ₦${amount || '0'} will be auto-charged from every member's wallet ${frequencyLabel}, no PIN prompt. Each round, the full pot goes to one member — rotation order is shuffled fairly when you start the group.`}
          </p>

          <Button fullWidth size="lg" loading={submitting} onClick={handleSubmit}>
            {mode === 'solo' ? 'Start Saving' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  );
}
