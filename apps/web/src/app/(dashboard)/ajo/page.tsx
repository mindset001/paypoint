'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, KeyRound, Users, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyStateIllustration } from '@/components/illustrations/EmptyState';
import { ajoApi } from '@/lib/api';
import { formatNGN, formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface AjoPlanSummary {
  id: string;
  name: string;
  mode: 'solo' | 'group';
  amountKobo: number;
  frequency: string;
  totalSlots: number;
  totalCycles: number;
  currentCycle: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  nextDueDate?: string;
  members: { userId: string }[];
}

const STATUS_STYLE: Record<string, string> = {
  forming: 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600',
  active: 'bg-green-50 dark:bg-green-500/15 text-green-600',
  completed: 'bg-surface-2 text-ink-muted',
  cancelled: 'bg-red-50 dark:bg-red-500/15 text-red-600',
};

export default function AjoListPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<AjoPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ajoApi.list()
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Ajo</h1>
        <p className="text-indigo-100 text-sm">Save solo or take turns with friends</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          <div className="flex gap-2">
            <Link href="/ajo/new" className="flex-1">
              <Button fullWidth size="lg"><span className="flex items-center gap-2"><Plus size={18} /> New Plan</span></Button>
            </Link>
            <Link href="/ajo/join" className="flex-1">
              <Button fullWidth size="lg" variant="secondary"><span className="flex items-center gap-2"><KeyRound size={18} /> Join with Code</span></Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <EmptyStateIllustration variant="wallet" />
              <p className="text-ink-muted text-sm">No Ajo plans yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {plans.map((plan) => (
                <Link key={plan.id} href={`/ajo/${plan.id}`} className="border border-line rounded-2xl p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {plan.mode === 'group' ? <Users size={16} className="text-indigo-500" /> : <UserIcon size={16} className="text-indigo-500" />}
                      <p className="font-bold text-ink">{plan.name}</p>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', STATUS_STYLE[plan.status])}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="text-xl font-black text-indigo-600">{formatNGN(plan.amountKobo)}<span className="text-xs font-medium text-ink-muted"> / {plan.frequency}</span></p>
                  <p className="text-xs text-ink-muted">
                    {plan.mode === 'group' ? `${plan.members.length}/${plan.totalSlots} members · ` : ''}
                    {plan.status === 'active' && plan.nextDueDate ? `Cycle ${plan.currentCycle}/${plan.totalCycles} · Next due ${formatDate(plan.nextDueDate)}` : null}
                    {plan.status === 'forming' ? 'Waiting to start' : null}
                    {plan.status === 'completed' ? 'Completed' : null}
                    {plan.status === 'cancelled' ? 'Cancelled' : null}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
