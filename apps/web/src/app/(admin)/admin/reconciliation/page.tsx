'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw, Wallet, Landmark, BookOpen, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNGN } from '@/lib/utils';
import type { AdminTransactionRow, AdminLedgerEntry, AdminSavingsLockRow } from '@/types';

type Tab = 'deposits' | 'withdrawals' | 'ledger' | 'savings';

const TABS: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: 'deposits',    label: 'Stuck Deposits',      icon: Wallet },
  { id: 'withdrawals', label: 'Pending Withdrawals',  icon: Landmark },
  { id: 'ledger',      label: 'Ledger',               icon: BookOpen },
  { id: 'savings',     label: 'Savings Locks',        icon: PiggyBank },
];

const ageLabel = (createdAt: string) => {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function ReconciliationPage() {
  const [tab, setTab] = useState<Tab>('deposits');

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Reconciliation</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Resolve money that the usual webhook/verify path never completed, and see where money sits outside the main wallet
        </p>
      </div>

      <div className="flex gap-2 mb-5 border-b border-slate-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === id ? 'border-brand-blue text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'deposits' && <StuckDeposits />}
      {tab === 'withdrawals' && <PendingWithdrawals />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'savings' && <SavingsTab />}
    </div>
  );
}

function StuckDeposits() {
  const [rows, setRows] = useState<AdminTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.stuckDeposits()
      .then((r) => setRows(r.data.data))
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load stuck deposits'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const reconcile = async (id: string) => {
    setReconcilingId(id);
    try {
      const { data } = await adminApi.reconcileDeposit(id);
      const outcome = data.data.outcome;
      if (outcome === 'credited') toast.success('Deposit verified and credited to wallet');
      else if (outcome === 'not_successful') toast.error(`Provider says: ${data.data.message}`);
      else toast.success('Already processed');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Reconcile failed';
      toast.error(msg);
    } finally {
      setReconcilingId(null);
    }
  };

  return (
    <Panel
      loading={loading}
      err={err}
      onRefresh={load}
      empty={rows.length === 0}
      emptyIcon={Wallet}
      emptyText="No deposits stuck pending right now"
      count={rows.length}
      countLabel="stuck deposit"
    >
      <div className="hidden lg:grid grid-cols-[110px_1fr_110px_90px_100px_110px] gap-4 px-5 py-3 border-b border-slate-700/50">
        {['Age', 'User', 'Amount', 'Provider', 'Ref', ''].map((h) => (
          <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
        ))}
      </div>
      {rows.map((tx) => (
        <div key={tx._id}
          className="grid grid-cols-1 lg:grid-cols-[110px_1fr_110px_90px_100px_110px] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30">
          <p className="text-yellow-400 text-xs font-semibold">{ageLabel(tx.createdAt)}</p>
          <div className="min-w-0">
            {tx.userId ? (
              <>
                <p className="text-slate-200 text-sm font-medium truncate">{tx.userId.firstName} {tx.userId.lastName}</p>
                <p className="text-slate-500 text-xs">{tx.userId.phone?.number}</p>
              </>
            ) : <p className="text-slate-500 text-sm">—</p>}
          </div>
          <p className="text-white text-sm font-semibold">{formatNGN(tx.amount)}</p>
          <p className="text-slate-300 text-sm capitalize">{tx.meta?.provider ?? '—'}</p>
          <p className="text-slate-600 text-xs font-mono truncate">{tx.reference.slice(-10)}</p>
          <button onClick={() => reconcile(tx._id)} disabled={reconcilingId === tx._id}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-fit">
            <RefreshCw size={13} className={reconcilingId === tx._id ? 'animate-spin' : ''} />
            Verify now
          </button>
        </div>
      ))}
    </Panel>
  );
}

function PendingWithdrawals() {
  const [rows, setRows] = useState<AdminTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.pendingWithdrawals()
      .then((r) => setRows(r.data.data))
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load pending withdrawals'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const reconcile = async (id: string) => {
    setReconcilingId(id);
    try {
      const { data } = await adminApi.reconcileWithdrawal(id);
      const outcome = data.data.outcome;
      if (outcome === 'completed') toast.success('Withdrawal confirmed successful');
      else if (outcome === 'refunded') toast.success('Withdrawal failed on Paystack — wallet refunded');
      else if (outcome === 'still_pending') toast(`Still ${data.data.status} on Paystack's side — business approval needed there`, { icon: '⏳' });
      else if (outcome === 'no_provider_reference') toast.error('Never reached Paystack — check manually');
      else toast.success('Already processed');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Reconcile failed';
      toast.error(msg);
    } finally {
      setReconcilingId(null);
    }
  };

  return (
    <Panel
      loading={loading}
      err={err}
      onRefresh={load}
      empty={rows.length === 0}
      emptyIcon={Landmark}
      emptyText="No withdrawals pending right now"
      count={rows.length}
      countLabel="pending withdrawal"
    >
      <div className="hidden lg:grid grid-cols-[110px_1fr_110px_1fr_100px_110px] gap-4 px-5 py-3 border-b border-slate-700/50">
        {['Age', 'User', 'Amount', 'Bank', 'Ref', ''].map((h) => (
          <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
        ))}
      </div>
      {rows.map((tx) => (
        <div key={tx._id}
          className="grid grid-cols-1 lg:grid-cols-[110px_1fr_110px_1fr_100px_110px] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30">
          <p className="text-yellow-400 text-xs font-semibold">{ageLabel(tx.createdAt)}</p>
          <div className="min-w-0">
            {tx.userId ? (
              <>
                <p className="text-slate-200 text-sm font-medium truncate">{tx.userId.firstName} {tx.userId.lastName}</p>
                <p className="text-slate-500 text-xs">{tx.userId.phone?.number}</p>
              </>
            ) : <p className="text-slate-500 text-sm">—</p>}
          </div>
          <p className="text-white text-sm font-semibold">{formatNGN(tx.amount)}</p>
          <p className="text-slate-300 text-sm truncate">{tx.meta?.bankName} · {tx.meta?.accountNumber}</p>
          <p className="text-slate-600 text-xs font-mono truncate">{tx.reference.slice(-10)}</p>
          <button onClick={() => reconcile(tx._id)} disabled={reconcilingId === tx._id}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-fit">
            <RefreshCw size={13} className={reconcilingId === tx._id ? 'animate-spin' : ''} />
            Re-check
          </button>
        </div>
      ))}
    </Panel>
  );
}

function LedgerTab() {
  const [rows, setRows] = useState<AdminLedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.ledger({ page, limit: 30, search })
      .then((r) => {
        setRows(r.data.data.entries);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load ledger'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-5">
        <input
          type="text"
          placeholder="Search by description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60"
        />
      </div>

      <Panel
        loading={loading}
        err={err}
        onRefresh={load}
        empty={rows.length === 0}
        emptyIcon={BookOpen}
        emptyText="No ledger entries found"
        count={total}
        countLabel="entry"
      >
        <div className="hidden lg:grid grid-cols-[140px_1fr_80px_100px_110px_110px_1fr] gap-4 px-5 py-3 border-b border-slate-700/50">
          {['Date', 'User', 'Entry', 'Amount', 'Before', 'After', 'Description'].map((h) => (
            <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
          ))}
        </div>
        {rows.map((l) => (
          <div key={l._id}
            className="grid grid-cols-1 lg:grid-cols-[140px_1fr_80px_100px_110px_110px_1fr] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30">
            <p className="text-slate-500 text-xs">
              {new Date(l.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              {' '}
              {new Date(l.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="min-w-0">
              {l.userId ? (
                <p className="text-slate-200 text-sm font-medium truncate">{l.userId.firstName} {l.userId.lastName}</p>
              ) : <p className="text-slate-500 text-sm">—</p>}
            </div>
            <span className={`text-xs font-semibold ${l.entry === 'credit' ? 'text-green-400' : 'text-slate-400'}`}>{l.entry}</span>
            <p className={`text-sm font-semibold ${l.entry === 'credit' ? 'text-green-400' : 'text-white'}`}>
              {l.entry === 'credit' ? '+' : '−'}{formatNGN(l.amount)}
            </p>
            <p className="text-slate-500 text-xs">{formatNGN(l.balanceBefore)}</p>
            <p className="text-slate-500 text-xs">{formatNGN(l.balanceAfter)}</p>
            <p className="text-slate-400 text-xs truncate">{l.description}</p>
          </div>
        ))}
      </Panel>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">Page {page} of {pages} · {total.toLocaleString()} entries</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={15} /> Prev
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SavingsTab() {
  const [rows, setRows] = useState<AdminSavingsLockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalLocked, setTotalLocked] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.savingsLocks({ page, limit: 30, status })
      .then((r) => {
        setRows(r.data.data.locks);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
        setTotalLocked(r.data.data.totalLockedActive);
      })
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load savings locks'))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Total locked (active)</p>
          <p className="text-white text-xl font-black mt-0.5">{formatNGN(totalLocked)}</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      <Panel
        loading={loading}
        err={err}
        onRefresh={load}
        empty={rows.length === 0}
        emptyIcon={PiggyBank}
        emptyText="No savings locks found"
        count={total}
        countLabel="lock"
      >
        <div className="hidden lg:grid grid-cols-[1fr_1fr_110px_90px_120px_120px] gap-4 px-5 py-3 border-b border-slate-700/50">
          {['User', 'Goal', 'Amount', 'Status', 'Started', 'Matures'].map((h) => (
            <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
          ))}
        </div>
        {rows.map((lock) => (
          <div key={lock._id}
            className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_110px_90px_120px_120px] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30">
            <div className="min-w-0">
              {lock.userId ? (
                <>
                  <p className="text-slate-200 text-sm font-medium truncate">{lock.userId.firstName} {lock.userId.lastName}</p>
                  <p className="text-slate-500 text-xs">{lock.userId.phone?.number}</p>
                </>
              ) : <p className="text-slate-500 text-sm">—</p>}
            </div>
            <p className="text-slate-300 text-sm truncate">{lock.name}</p>
            <p className="text-white text-sm font-semibold">{formatNGN(lock.amount)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-flex w-fit ${
              lock.status === 'active' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {lock.status}
            </span>
            <p className="text-slate-500 text-xs">{new Date(lock.startDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
            <p className="text-slate-500 text-xs">{new Date(lock.maturityDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
          </div>
        ))}
      </Panel>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">Page {page} of {pages} · {total.toLocaleString()} locks</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={15} /> Prev
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Panel({
  loading, err, onRefresh, empty, emptyIcon: EmptyIcon, emptyText, count, countLabel, children,
}: {
  loading: boolean; err: string; onRefresh: () => void; empty: boolean;
  emptyIcon: typeof Wallet; emptyText: string; count: number; countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm">{count.toLocaleString()} {countLabel}{count === 1 ? '' : 's'}</p>
        <button onClick={onRefresh} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertTriangle size={15} />
          {err}
        </div>
      )}

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        {loading && (
          <div className="divide-y divide-slate-700/30">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-24" />
                <div className="h-3 bg-slate-700/60 rounded flex-1" />
                <div className="h-3 bg-slate-700/40 rounded w-16" />
              </div>
            ))}
          </div>
        )}

        {!loading && empty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyIcon size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">{emptyText}</p>
          </div>
        )}

        {!loading && !empty && children}
      </div>
    </>
  );
}
