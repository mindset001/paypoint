'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Gift, RefreshCw, Percent, Eye } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

interface BonusByTier {
  basic: number;
  standard: number;
  premium: number;
}

const TIER_LABELS: Record<keyof BonusByTier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

function SettingsCard({ icon: Icon, title, sub, children }: { icon: typeof Gift; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-brand-blue/10 border border-brand-blue/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-brand-blue" />
        </div>
        <div>
          <p className="text-white font-semibold">{title}</p>
          <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReferralBonusCard() {
  const [values, setValues] = useState<BonusByTier>({ basic: 0, standard: 0, premium: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getReferralBonusSettings()
      .then((r) => setValues(r.data.data))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const r = await adminApi.updateReferralBonusSettings(values);
      setValues(r.data.data);
      toast.success('Referral bonus settings updated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon={Gift} title="Referral Bonus by Tier" sub="Paid to the referrer when their referee completes their first successful transaction.">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-11 bg-slate-700/50 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(Object.keys(TIER_LABELS) as (keyof BonusByTier)[]).map((tier) => (
            <div key={tier}>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                {TIER_LABELS[tier]} tier
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₦</span>
                <input
                  type="number" min={0} step="1"
                  value={values[tier]}
                  onChange={(e) => setValues((v) => ({ ...v, [tier]: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
                />
              </div>
            </div>
          ))}
          <button onClick={onSave} disabled={saving}
            className="mt-1 w-full bg-brand-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </SettingsCard>
  );
}

interface CashbackRates { customer: number; agent: number }

function CashbackCard() {
  const [values, setValues] = useState<CashbackRates>({ customer: 0, agent: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getCashbackSettings()
      .then((r) => setValues(r.data.data))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const r = await adminApi.updateCashbackSettings(values);
      setValues(r.data.data);
      toast.success('Cashback settings updated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon={Percent} title="Cashback Rate" sub="Percent of each VTU purchase credited back to the buyer's wallet. Set to 0 to turn off.">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(2)].map((_, i) => <div key={i} className="h-11 bg-slate-700/50 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Regular users</label>
            <div className="relative">
              <input
                type="number" min={0} max={100} step="0.1"
                value={values.customer}
                onChange={(e) => setValues((v) => ({ ...v, customer: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-8 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Resellers</label>
            <div className="relative">
              <input
                type="number" min={0} max={100} step="0.1"
                value={values.agent}
                onChange={(e) => setValues((v) => ({ ...v, agent: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-8 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
            </div>
          </div>
          <button onClick={onSave} disabled={saving}
            className="mt-1 w-full bg-brand-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </SettingsCard>
  );
}

interface FeatureFlags { exam: boolean; reseller: boolean; savings: boolean }

const FEATURE_LABELS: Record<keyof FeatureFlags, { label: string; sub: string }> = {
  exam:     { label: 'Exam Pins',       sub: 'WAEC, NECO, NABTEB, JAMB purchases' },
  savings:  { label: 'Savings',         sub: 'Locking money away for a goal' },
  reseller: { label: 'Reseller Program', sub: 'The "Become a Reseller" section on support' },
};

function FeatureFlagsCard() {
  const [flags, setFlags] = useState<FeatureFlags>({ exam: false, reseller: false, savings: true });
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<keyof FeatureFlags | null>(null);

  useEffect(() => {
    adminApi.getFeatureFlags()
      .then((r) => setFlags(r.data.data))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof FeatureFlags) => {
    const next = !flags[key];
    setBusyKey(key);
    try {
      const r = await adminApi.updateFeatureFlags({ [key]: next });
      setFlags(r.data.data);
      toast.success(`${FEATURE_LABELS[key].label} ${next ? 'enabled' : 'set to Coming Soon'}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SettingsCard icon={Eye} title="Feature Visibility" sub="Hide a feature behind a Coming Soon badge without deploying code.">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-slate-700/50 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(Object.keys(FEATURE_LABELS) as (keyof FeatureFlags)[]).map((key) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl">
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">{FEATURE_LABELS[key].label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{FEATURE_LABELS[key].sub}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                disabled={busyKey === key}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${flags[key] ? 'bg-green-500' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${flags[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}

export default function AdminSettingsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform-wide configuration</p>
        </div>
        <button onClick={() => setRefreshKey((k) => k + 1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div key={refreshKey} className="flex flex-col gap-5">
        <FeatureFlagsCard />
        <CashbackCard />
        <ReferralBonusCard />
      </div>
    </div>
  );
}
