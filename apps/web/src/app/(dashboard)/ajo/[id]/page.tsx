'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Check, Play, X, Users, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ajoApi } from '@/lib/api';
import { formatNGN, formatDate, getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';

interface Contribution {
  _id: string;
  cycleNumber: number;
  userId: string;
  amountKobo: number;
  status: 'pending' | 'paid' | 'forced';
}

interface Payout {
  _id: string;
  cycleNumber: number;
  recipientUserId: string;
  amountKobo: number;
  status: 'pending' | 'paid';
  paidAt?: string;
}

interface PlanDetail {
  id: string;
  creatorId: string;
  name: string;
  mode: 'solo' | 'group';
  frequency: string;
  amountKobo: number;
  totalSlots: number;
  totalCycles: number;
  inviteCode?: string;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  members: { userId: string; position?: number }[];
  rotationOrder: string[];
  currentCycle: number;
  nextDueDate?: string;
  isCreator: boolean;
  currentCycleContributions: Contribution[];
  contributions: Contribution[];
  payouts: Payout[];
}

export default function AjoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    ajoApi.get(id)
      .then(({ data }) => setPlan(data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copyCode = () => {
    if (!plan?.inviteCode) return;
    navigator.clipboard.writeText(plan.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      await ajoApi.start(id);
      toast.success('Group started!');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await ajoApi.cancel(id);
      toast.success('Plan cancelled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForce = async (contributionId: string) => {
    setBusy(true);
    try {
      await ajoApi.forceSettle(id, contributionId);
      toast.success('Marked as settled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="px-5 pt-14 flex flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <div className="flex items-center gap-2">
          {plan.mode === 'group' ? <Users size={18} className="text-indigo-200" /> : <UserIcon size={18} className="text-indigo-200" />}
          <h1 className="text-white text-2xl font-black">{plan.name}</h1>
        </div>
        <p className="text-indigo-100 text-sm capitalize">{plan.mode} · {plan.frequency} · {plan.status}</p>
      </div>

      <div className="px-5 -mt-4 pb-8 flex flex-col gap-4">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-ink-muted">Per contribution</p>
              <p className="text-2xl font-black text-indigo-600">{formatNGN(plan.amountKobo)}</p>
            </div>
            {plan.status === 'active' && (
              <div className="text-right">
                <p className="text-xs text-ink-muted">Cycle</p>
                <p className="font-bold text-ink">{plan.currentCycle} / {plan.totalCycles}</p>
              </div>
            )}
          </div>

          {plan.status === 'active' && plan.nextDueDate && (
            <p className="text-xs text-ink-muted bg-surface-2 rounded-xl p-3">
              Next due {formatDate(plan.nextDueDate)} — auto-collected from each member's wallet.
            </p>
          )}

          {plan.status === 'forming' && plan.inviteCode && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink-muted">Invite code</p>
              <button onClick={copyCode} className="flex items-center justify-between gap-2 border border-dashed border-indigo-300 rounded-xl px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10">
                <span className="text-lg font-black tracking-widest text-indigo-700 dark:text-indigo-400">{plan.inviteCode}</span>
                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-indigo-600" />}
              </button>
              <p className="text-xs text-ink-muted">{plan.members.length}/{plan.totalSlots} members joined. Share this code with friends to invite them.</p>
            </div>
          )}

          {plan.status === 'forming' && plan.isCreator && (
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth loading={busy} onClick={handleCancel}>
                <span className="flex items-center gap-1.5"><X size={16} /> Cancel</span>
              </Button>
              <Button fullWidth loading={busy} disabled={plan.members.length < 2} onClick={handleStart}>
                <span className="flex items-center gap-1.5"><Play size={16} /> Start Group</span>
              </Button>
            </div>
          )}
        </div>

        {plan.mode === 'group' && plan.rotationOrder?.length > 0 && (
          <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-3">
            <p className="text-sm font-bold text-ink-muted uppercase tracking-wide">Payout Order</p>
            <div className="flex flex-col gap-2">
              {plan.rotationOrder.map((uid, idx) => {
                const isCurrentTurn = plan.status === 'active' && idx === plan.currentCycle - 1;
                const payout = plan.payouts.find((p) => p.cycleNumber === idx + 1);
                return (
                  <div key={uid} className={cn('flex items-center justify-between px-3 py-2 rounded-xl',
                    isCurrentTurn ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-surface-2')}>
                    <span className="text-sm font-medium text-ink">
                      #{idx + 1} {uid === user?.id ? '(You)' : uid.slice(-6)}
                      {isCurrentTurn && <span className="ml-2 text-xs text-indigo-600 font-bold">Current turn</span>}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {payout?.status === 'paid' ? `Paid ${formatDate(payout.paidAt!)}` : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {plan.status === 'active' && plan.currentCycleContributions.length > 0 && (
          <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-3">
            <p className="text-sm font-bold text-ink-muted uppercase tracking-wide">This Cycle</p>
            <div className="flex flex-col gap-2">
              {plan.currentCycleContributions.map((c) => (
                <div key={c._id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-2">
                  <span className="text-sm font-medium text-ink">
                    {c.userId === user?.id ? 'You' : `Member ${c.userId.slice(-6)}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      c.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600' : 'bg-green-50 dark:bg-green-500/15 text-green-600')}>
                      {c.status === 'pending' ? 'Pending' : c.status === 'forced' ? 'Settled' : 'Paid'}
                    </span>
                    {plan.isCreator && c.status === 'pending' && (
                      <button onClick={() => handleForce(c._id)} disabled={busy} className="text-xs text-indigo-600 underline">
                        Force
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {plan.mode === 'group' && (
              <p className="text-xs text-ink-muted">Payout waits until everyone above is Paid or Settled.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
