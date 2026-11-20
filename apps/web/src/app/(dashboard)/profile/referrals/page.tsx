'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Share2, Users, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { referralApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface Stats {
  referralCode: string | null;
  totalReferred: number;
  completed: number;
  pending: number;
  totalEarnedNGN: number;
}

interface Referral {
  _id: string;
  refereeId: { _id: string; firstName: string; lastName: string } | null;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
  bonusAmount?: number;
}

export default function ReferralsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([referralApi.stats(), referralApi.history({ limit: 50 })])
      .then(([statsRes, historyRes]) => {
        setStats(statsRes.data.data);
        setReferrals(historyRes.data.data.referrals || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const code = stats?.referralCode;

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success('Referral code copied!');
  };

  const shareCode = async () => {
    if (!code) return;
    const text = `Join me on Paycen! Use my code ${code} when you sign up.`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Invite message copied!');
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Referrals</h1>
        <p className="text-blue-100 text-sm">Invite friends, earn a bonus on their first transaction</p>
      </div>

      <div className="px-5 -mt-4 pb-8 flex flex-col gap-4">
        {/* Code card */}
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-3">
          <p className="text-xs text-ink-muted">Your Referral Code</p>
          {loading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <p className="text-2xl font-black text-brand-blue tracking-widest">{code}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copyCode}
              className="flex items-center justify-center gap-1.5 text-sm text-brand-blue font-semibold bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 rounded-xl">
              <Copy size={14} /> Copy
            </button>
            <button onClick={shareCode}
              className="flex items-center justify-center gap-1.5 text-sm text-white font-semibold bg-brand-blue px-3 py-2.5 rounded-xl">
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            <>
              <div className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Total Referred</p>
                  <p className="text-lg font-black text-ink">{stats?.totalReferred ?? 0}</p>
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Completed</p>
                  <p className="text-lg font-black text-ink">{stats?.completed ?? 0}</p>
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Pending</p>
                  <p className="text-lg font-black text-ink">{stats?.pending ?? 0}</p>
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Wallet size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Total Earned</p>
                  <p className="text-lg font-black text-ink">₦{(stats?.totalEarnedNGN ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* History */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3 px-1">
            Referral History
          </p>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : referrals.length === 0 ? (
            <div className="bg-surface rounded-2xl p-8 flex flex-col items-center text-center gap-2 border border-line">
              <Users size={32} className="text-ink-muted" />
              <p className="text-sm text-ink-muted">No referrals yet — share your code to get started!</p>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-line">
              {referrals.map((r) => (
                <div key={r._id} className="flex items-center gap-3 p-4 border-b border-line last:border-0">
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0 text-xs font-bold text-ink-muted">
                    {r.refereeId ? `${r.refereeId.firstName[0]}${r.refereeId.lastName[0]}` : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {r.refereeId ? `${r.refereeId.firstName} ${r.refereeId.lastName}` : 'Unknown user'}
                    </p>
                    <p className="text-xs text-ink-muted">{formatDate(r.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
                      r.status === 'completed' ? 'bg-green-50 dark:bg-green-500/15 text-green-600' : 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600')}>
                      {r.status}
                    </span>
                    {r.status === 'completed' && r.bonusAmount != null && (
                      <p className="text-xs font-bold text-green-600 mt-1">+₦{(r.bonusAmount / 100).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
