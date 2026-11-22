'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { profileApi, servicesApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type Tab = 'number' | 'nin' | 'bvn';
type FeatureStatus = 'live' | 'coming_soon' | 'hidden';

const FLAG_KEY: Record<Tab, 'kyc_number' | 'kyc_nin' | 'kyc_bvn'> = { number: 'kyc_number', nin: 'kyc_nin', bvn: 'kyc_bvn' };
const TAB_LABEL: Record<Tab, string> = { number: 'Number', nin: 'NIN', bvn: 'BVN' };

// Mirrors the API's defaults (apps/api/src/services/featureFlags.service.js)
// so a tab doesn't flash the wrong state before the real flags load.
const DEFAULT_FLAGS: Record<'kyc_number' | 'kyc_nin' | 'kyc_bvn', FeatureStatus> = {
  kyc_number: 'coming_soon', kyc_nin: 'live', kyc_bvn: 'live',
};

const isValid = (tab: Tab, value: string) =>
  tab === 'number' ? /^\+?[0-9]{10,14}$/.test(value) : /^\d{11}$/.test(value);

export default function KycPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [tab, setTab] = useState<Tab>('nin');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    servicesApi.features().then((r) => {
      const next = { ...DEFAULT_FLAGS, ...r.data.data };
      setFlags(next);
      setTab((t) => {
        if (next[FLAG_KEY[t]] === 'hidden') {
          const fallback = (['nin', 'bvn', 'number'] as Tab[]).find((x) => next[FLAG_KEY[x]] !== 'hidden');
          return fallback ?? t;
        }
        return t;
      });
    }).catch(() => {});
  }, []);

  const alreadySubmitted = !!user?.kycSubmittedAt || user?.status === 'pending_kyc';
  const isVerified = user?.status === 'active' && !!user?.kycSubmittedAt;

  const handleSubmit = async () => {
    if (!isValid(tab, value)) {
      toast.error(tab === 'number' ? 'Enter a valid phone number' : `${TAB_LABEL[tab]} must be exactly 11 digits`);
      return;
    }
    setLoading(true);
    try {
      const payload = tab === 'nin' ? { nin: value } : tab === 'bvn' ? { bvn: value } : { number: value };
      const { data } = await profileApi.submitKyc(payload);
      setUser(data.data);
      toast.success(data.message || 'KYC submitted! We\'ll review within 24 hours.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const visibleTabs = (['nin', 'bvn', 'number'] as Tab[]).filter((t) => flags[FLAG_KEY[t]] !== 'hidden');
  const comingSoon = flags[FLAG_KEY[tab]] === 'coming_soon';

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-6">
        <button onClick={() => router.back()} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold">Identity Verification</h1>
        <p className="text-blue-300 text-sm mt-1">Verify your identity to unlock higher limits</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Status banner */}
        {isVerified ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800 text-sm">Identity Verified</p>
              <p className="text-green-600 text-xs">Your account is fully verified.</p>
            </div>
          </div>
        ) : user?.status === 'pending_kyc' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
            <Clock size={24} className="text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-yellow-800 text-sm">Under Review</p>
              <p className="text-yellow-600 text-xs">Your documents are being reviewed. Usually within 24 hours.</p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-brand-blue flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 text-sm">Submit your NIN, BVN, or phone number to verify your identity and unlock higher transaction limits.</p>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-ink-muted font-semibold uppercase tracking-wide mb-3">Why verify?</p>
          {[
            'Higher daily transaction limits',
            'Faster dispute resolution',
            'Access to agent & premium features',
            'Regulatory compliance (CBN)',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 py-1.5">
              <ShieldCheck size={15} className="text-green-500 flex-shrink-0" />
              <span className="text-sm text-ink-muted">{item}</span>
            </div>
          ))}
        </div>

        {/* Form — only show if not yet submitted */}
        {!alreadySubmitted && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm">
            {/* Number / NIN / BVN tabs */}
            <div className="flex bg-surface-2 rounded-xl p-1 mb-5">
              {visibleTabs.map((t) => {
                const tComingSoon = flags[FLAG_KEY[t]] === 'coming_soon';
                return (
                  <button
                    key={t}
                    disabled={tComingSoon}
                    onClick={() => { setTab(t); setValue(''); }}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-bold transition-all flex flex-col items-center gap-0.5',
                      tComingSoon
                        ? 'text-ink-muted/60 cursor-not-allowed'
                        : tab === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted',
                    )}
                  >
                    {TAB_LABEL[t].toUpperCase()}
                    {tComingSoon && <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600">Soon</span>}
                  </button>
                );
              })}
            </div>

            {comingSoon ? (
              <p className="text-ink-muted text-sm text-center py-2">
                {TAB_LABEL[tab]} verification isn&apos;t available yet — check back soon.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-ink-muted font-medium mb-1.5 block">
                    {tab === 'nin' ? 'National Identification Number (NIN)' : tab === 'bvn' ? 'Bank Verification Number (BVN)' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    inputMode={tab === 'number' ? 'tel' : 'numeric'}
                    maxLength={tab === 'number' ? 14 : 11}
                    value={value}
                    onChange={(e) => {
                      const cleaned = tab === 'number' ? e.target.value.replace(/[^\d+]/g, '') : e.target.value.replace(/\D/g, '');
                      setValue(cleaned.slice(0, tab === 'number' ? 14 : 11));
                    }}
                    placeholder={tab === 'number' ? 'Enter your phone number' : 'Enter 11-digit number'}
                    className="w-full border border-line bg-surface rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  {tab !== 'number' && <p className="text-xs text-ink-muted mt-1">{value.length}/11 digits</p>}
                </div>

                <p className="text-xs text-ink-muted">
                  {tab === 'number'
                    ? 'Phone number verification is reviewed manually by our team — no instant approval.'
                    : 'Your information is encrypted and used only for identity verification. We do not share it with third parties.'}
                </p>

                <Button
                  fullWidth
                  loading={loading}
                  onClick={handleSubmit}
                  disabled={!isValid(tab, value)}
                >
                  Submit {TAB_LABEL[tab]} for Verification
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
