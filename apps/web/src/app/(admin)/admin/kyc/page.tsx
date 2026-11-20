'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw, ShieldCheck, Check, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminKycRow } from '@/types';

export default function KycReviewPage() {
  const [rows, setRows] = useState<AdminKycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.pendingKyc()
      .then((r) => setRows(r.data.data))
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load pending KYC'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await adminApi.approveKyc(id);
      toast.success('KYC approved — account activated');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Approve failed';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Give a reason for the rejection'); return; }
    setBusyId(id);
    try {
      await adminApi.rejectKyc(id, rejectReason.trim());
      toast.success('KYC rejected — user can resubmit');
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Reject failed';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">KYC Review</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Accounts where the name on the NIN/BVN record didn&apos;t auto-match the account name
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
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

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/60 border border-slate-700/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-800/60 border border-slate-700/50 rounded-2xl">
          <ShieldCheck size={36} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-semibold">No KYC submissions awaiting review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">On account</p>
                  <p className="text-white text-lg font-bold">{row.firstName} {row.lastName}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{row.email} · {row.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">On {row.idType ?? 'ID'} record</p>
                  <p className="text-yellow-400 text-lg font-bold">{row.verifiedName ?? '—'}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {row.idType} ending {row.idLast4} · submitted {new Date(row.submittedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              {row.priorRejectionReason && (
                <p className="text-xs text-slate-500 mt-3 italic">Previously rejected: {row.priorRejectionReason}</p>
              )}

              {rejectingId === row.id ? (
                <div className="mt-4 pt-4 border-t border-slate-700/40 flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Reason for rejection…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60"
                  />
                  <button onClick={() => submitReject(row.id)} disabled={busyId === row.id}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors">
                    Confirm
                  </button>
                  <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-700/40 flex gap-2">
                  <button onClick={() => approve(row.id)} disabled={busyId === row.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors">
                    <Check size={15} /> Approve anyway
                  </button>
                  <button onClick={() => setRejectingId(row.id)} disabled={busyId === row.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                    <X size={15} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
