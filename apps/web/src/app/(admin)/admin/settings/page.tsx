'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Gift, RefreshCw } from 'lucide-react';
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

export default function AdminSettingsPage() {
  const [values, setValues] = useState<BonusByTier>({ basic: 0, standard: 0, premium: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi.getReferralBonusSettings()
      .then((r) => setValues(r.data.data))
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onChange = (tier: keyof BonusByTier, value: string) => {
    setValues((v) => ({ ...v, [tier]: Number(value) }));
  };

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
    <div className="p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform-wide configuration</p>
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

      {/* Referral bonus card */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-brand-blue/10 border border-brand-blue/20 rounded-xl flex items-center justify-center">
            <Gift size={18} className="text-brand-blue" />
          </div>
          <div>
            <p className="text-white font-semibold">Referral Bonus by Tier</p>
            <p className="text-slate-500 text-xs mt-0.5">
              Paid to the referrer when their referee completes their first successful transaction.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-11 bg-slate-700/50 rounded-xl" />
            ))}
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
                    type="number"
                    min={0}
                    step="1"
                    value={values[tier]}
                    onChange={(e) => onChange(tier, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={onSave}
              disabled={saving}
              className="mt-1 w-full bg-brand-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
