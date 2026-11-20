'use client';
import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminAuditLogEntry } from '@/types';

const ACTION_LABEL: Record<string, string> = {
  'user.status.update':   'Changed user status',
  'user.role.update':     'Changed user role',
  'kyc.approve':          'Approved KYC',
  'kyc.reject':           'Rejected KYC',
  'deposit.reconcile':    'Reconciled deposit',
  'withdrawal.reconcile': 'Reconciled withdrawal',
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.auditLog({ page, limit: 30, action })
      .then((r) => {
        setRows(r.data.data.entries);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [page, action]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [action]);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Audit Log</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString()} recorded admin actions</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-5">
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60">
          <option value="">All actions</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertTriangle size={15} />
          {err}
        </div>
      )}

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-[140px_160px_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-slate-700/50">
          {['Date', 'Admin', 'Action', 'Target', 'Change'].map((h) => (
            <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {loading && (
          <div className="divide-y divide-slate-700/30">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-24" />
                <div className="h-3 bg-slate-700/60 rounded flex-1" />
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">No admin actions recorded yet</p>
          </div>
        )}

        {!loading && rows.map((entry) => (
          <div key={entry._id}
            className="grid grid-cols-1 lg:grid-cols-[140px_160px_1fr_1fr_1fr] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30">
            <p className="text-slate-500 text-xs">
              {new Date(entry.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              {' '}
              {new Date(entry.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-slate-300 text-sm truncate">
              {entry.adminId ? `${entry.adminId.firstName} ${entry.adminId.lastName}` : '—'}
            </p>
            <p className="text-white text-sm font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</p>
            <p className="text-slate-400 text-sm truncate">
              {entry.targetUserId ? `${entry.targetUserId.firstName} ${entry.targetUserId.lastName}` : entry.targetTransactionId?.reference ?? '—'}
            </p>
            <p className="text-slate-500 text-xs truncate" title={entry.reason}>
              {entry.before && entry.after
                ? `${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`
                : '—'}
              {entry.reason && <span className="text-slate-600"> ({entry.reason})</span>}
            </p>
          </div>
        ))}
      </div>

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
    </div>
  );
}
