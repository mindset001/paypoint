'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Gift, RefreshCw, Percent, Eye, UserPlus } from 'lucide-react';
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

function SignupBonusCard() {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSignupBonusSettings()
      .then((r) => setAmount(r.data.data.amount))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const r = await adminApi.updateSignupBonusSettings(amount);
      setAmount(r.data.data.amount);
      toast.success('Signup bonus updated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon={UserPlus} title="Signup Bonus" sub="Paid to a new user instantly when they register with a referral code. Set to 0 to disable.">
      {loading ? (
        <div className="h-11 bg-slate-700/50 rounded-xl animate-pulse" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₦</span>
            <input
              type="number" min={0} step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
            />
          </div>
          <button onClick={onSave} disabled={saving}
            className="w-full bg-brand-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </SettingsCard>
  );
}

type FeatureStatus = 'live' | 'coming_soon' | 'hidden';
interface FeatureFlags {
  exam: FeatureStatus; reseller: FeatureStatus; savings: FeatureStatus; withdrawal: FeatureStatus;
  ajo: FeatureStatus; esim: FeatureStatus;
  paystack: FeatureStatus; flutterwave: FeatureStatus; monnify: FeatureStatus;
  kyc_bvn: FeatureStatus; kyc_nin: FeatureStatus; kyc_number: FeatureStatus;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  exam: 'coming_soon', reseller: 'coming_soon', savings: 'live', withdrawal: 'live',
  ajo: 'live', esim: 'coming_soon',
  paystack: 'live', flutterwave: 'coming_soon', monnify: 'coming_soon',
  kyc_bvn: 'live', kyc_nin: 'live', kyc_number: 'coming_soon',
};

const FEATURE_LABELS: Record<keyof FeatureFlags, { label: string; sub: string }> = {
  exam:        { label: 'Exam Pins',       sub: 'WAEC, NECO, NABTEB, JAMB purchases' },
  savings:     { label: 'Savings',         sub: 'Locking money away for a goal' },
  ajo:         { label: 'Ajo',             sub: 'Solo and group contribution/savings circles' },
  esim:        { label: 'eSIM',            sub: 'Travel data eSIMs — still coming_soon until a provider order is live-tested' },
  reseller:    { label: 'Reseller Program', sub: 'The "Become a Reseller" section on support' },
  withdrawal:  { label: 'Bank Withdrawal', sub: 'Moving wallet balance out to a bank account (Paystack transfer)' },
  paystack:    { label: 'Paystack',        sub: 'Card, bank transfer, USSD funding' },
  flutterwave: { label: 'Flutterwave',     sub: 'Card, bank transfer, USSD funding' },
  monnify:     { label: 'Monnify',         sub: 'Bank transfer / virtual account funding' },
  kyc_bvn:     { label: 'BVN Verification', sub: 'Identity check via Bank Verification Number' },
  kyc_nin:     { label: 'NIN Verification', sub: 'Identity check via National ID Number' },
  kyc_number:  { label: 'Phone Number Verification', sub: 'No automated lookup — goes to manual KYC review' },
};

const FEATURE_GROUPS: { key: keyof FeatureFlags }[][] = [
  [{ key: 'exam' }, { key: 'savings' }, { key: 'ajo' }, { key: 'esim' }, { key: 'withdrawal' }, { key: 'reseller' }],
  [{ key: 'paystack' }, { key: 'flutterwave' }, { key: 'monnify' }],
  [{ key: 'kyc_bvn' }, { key: 'kyc_nin' }, { key: 'kyc_number' }],
];

const STATUS_OPTIONS: { value: FeatureStatus; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'hidden', label: 'Hidden' },
];

const STATUS_PILL: Record<FeatureStatus, string> = {
  live: 'bg-green-500/15 text-green-400 border-green-500/30',
  coming_soon: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  hidden: 'bg-slate-600/20 text-slate-400 border-slate-600/40',
};

function FeatureFlagsCard({ title, sub, keys }: { title: string; sub: string; keys: (keyof FeatureFlags)[] }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<keyof FeatureFlags | null>(null);

  useEffect(() => {
    adminApi.getFeatureFlags()
      .then((r) => setFlags(r.data.data))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (key: keyof FeatureFlags, status: FeatureStatus) => {
    if (status === flags[key]) return;
    setBusyKey(key);
    try {
      const r = await adminApi.updateFeatureFlags({ [key]: status });
      setFlags(r.data.data);
      toast.success(`${FEATURE_LABELS[key].label} set to ${STATUS_OPTIONS.find((o) => o.value === status)?.label}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SettingsCard icon={Eye} title={title} sub={sub}>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {keys.map((k) => <div key={k} className="h-16 bg-slate-700/50 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {keys.map((key) => (
            <div key={key} className="flex flex-col gap-2.5 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold">{FEATURE_LABELS[key].label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{FEATURE_LABELS[key].sub}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${STATUS_PILL[flags[key]]}`}>
                  {STATUS_OPTIONS.find((o) => o.value === flags[key])?.label}
                </span>
              </div>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(key, opt.value)}
                    disabled={busyKey === key}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      flags[key] === opt.value
                        ? 'bg-brand-blue border-brand-blue text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
        <FeatureFlagsCard
          title="Feature Visibility"
          sub="Live, Coming Soon (visible but disabled), or Hidden (not shown at all) — no deploy needed."
          keys={FEATURE_GROUPS[0].map((g) => g.key)}
        />
        <FeatureFlagsCard
          title="Payment Providers"
          sub="Which funding providers customers can pick on the Fund Wallet page."
          keys={FEATURE_GROUPS[1].map((g) => g.key)}
        />
        <FeatureFlagsCard
          title="Identity Verification"
          sub="Which KYC methods customers can submit on the Identity Verification page."
          keys={FEATURE_GROUPS[2].map((g) => g.key)}
        />
        <CashbackCard />
        <SignupBonusCard />
        <ReferralBonusCard />
      </div>
    </div>
  );
}
