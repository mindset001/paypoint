'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Wifi, Save, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { AdminDataPlanGroup, AdminDataPlanRow } from '@/types';

function PlanRow({
  plan,
  onSaved,
  onRemoved,
}: {
  plan: AdminDataPlanRow;
  onSaved: (patch: Partial<AdminDataPlanRow>) => void;
  onRemoved: () => void;
}) {
  const [customer, setCustomer] = useState(plan.customerPrice != null ? String(plan.customerPrice) : '');
  const [agent, setAgent] = useState(plan.agentPrice != null ? String(plan.agentPrice) : '');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const priced = plan.customerPrice != null && plan.agentPrice != null;

  const save = async () => {
    const c = Number(customer);
    const a = Number(agent);
    if (!customer || !agent || Number.isNaN(c) || Number.isNaN(a) || c < 0 || a < 0) {
      toast.error('Enter valid customer and reseller prices');
      return;
    }
    setSaving(true);
    try {
      const r = await adminApi.setDataPlanPrice(plan.planId, { customer: c, agent: a });
      onSaved({ customerPrice: r.data.data.customerPrice, agentPrice: r.data.data.agentPrice });
      toast.success(`${plan.name} priced`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await adminApi.removeDataPlanPrice(plan.planId);
      setCustomer('');
      setAgent('');
      onRemoved();
      toast.success(`${plan.name} hidden from users`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_110px_110px_84px_72px] gap-2 lg:gap-3 items-center px-5 py-3.5 border-b border-slate-700/30">
      <div className="min-w-0">
        <p className="text-white text-sm font-medium truncate">{plan.name}</p>
        <p className="text-slate-500 text-xs mt-0.5">
          AidaPay cost ₦{plan.rawAmount.toLocaleString()} · {plan.validity}
          {!priced && <span className="ml-2 text-amber-400 font-semibold">Unpriced — hidden</span>}
        </p>
      </div>
      <input
        type="number" min={0} step="1" placeholder="Customer ₦"
        value={customer} onChange={(e) => setCustomer(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 w-full"
      />
      <input
        type="number" min={0} step="1" placeholder="Reseller ₦"
        value={agent} onChange={(e) => setAgent(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 w-full"
      />
      <button onClick={save} disabled={saving}
        className="flex items-center justify-center gap-1.5 bg-brand-blue text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        <Save size={13} /> {saving ? '…' : 'Save'}
      </button>
      <button onClick={remove} disabled={removing || !priced}
        className="flex items-center justify-center gap-1 text-red-400 hover:text-red-300 text-xs font-semibold py-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <Trash2 size={13} /> Hide
      </button>
    </div>
  );
}

export default function DataPlansPage() {
  const [groups, setGroups] = useState<AdminDataPlanGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.dataPlans()
      .then((r) => setGroups(r.data.data))
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updatePlan = (network: string, catalogKey: string, planId: string, patch: Partial<AdminDataPlanRow>) => {
    setGroups((prev) => prev.map((g) =>
      g.network === network && g.catalogKey === catalogKey
        ? { ...g, plans: g.plans.map((p) => (p.planId === planId ? { ...p, ...patch } : p)) }
        : g
    ));
  };

  const totalUnpriced = groups.reduce((sum, g) => sum + g.plans.filter((p) => p.customerPrice == null).length, 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-white text-2xl font-black">Data Plan Pricing</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Set what customers and resellers pay per plan — AidaPay&apos;s own cost is shown for reference only. Unpriced plans stay hidden from the app.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors shrink-0">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {!loading && !err && totalUnpriced > 0 && (
        <div className="mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">
            <span className="font-bold">{totalUnpriced}</span> plan{totalUnpriced === 1 ? '' : 's'} not yet priced — hidden from users until you set a price.
          </p>
        </div>
      )}

      {err && (
        <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={15} className="shrink-0" />
          {err}
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!loading && !err && (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((g) => (
            <div key={`${g.network}-${g.catalogKey}`}>
              <div className="flex items-center gap-2 mb-3">
                <Wifi size={15} className="text-slate-500" />
                <p className="text-white font-bold text-sm">{g.network}</p>
                <span className="text-slate-500 text-xs">· {g.catalogLabel}</span>
                <span className="text-slate-600 text-xs ml-auto">{g.plans.length} plans</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="hidden lg:grid grid-cols-[1fr_110px_110px_84px_72px] gap-3 px-5 py-2.5 border-b border-slate-700/50">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Plan</p>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Customer</p>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Reseller</p>
                  <p />
                  <p />
                </div>
                {g.plans.map((p) => (
                  <PlanRow
                    key={p.planId}
                    plan={p}
                    onSaved={(patch) => updatePlan(g.network, g.catalogKey, p.planId, patch)}
                    onRemoved={() => updatePlan(g.network, g.catalogKey, p.planId, { customerPrice: null, agentPrice: null })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
