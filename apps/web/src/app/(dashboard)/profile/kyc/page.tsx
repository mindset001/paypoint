'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { profileApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

type Tab = 'nin' | 'bvn';

export default function KycPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('nin');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const alreadySubmitted = !!user?.kycSubmittedAt || user?.status === 'pending_kyc';
  const isVerified = user?.status === 'active' && !!user?.kycSubmittedAt;

  const handleSubmit = async () => {
    if (value.length !== 11 || !/^\d+$/.test(value)) {
      toast.error(`${tab.toUpperCase()} must be exactly 11 digits`);
      return;
    }
    setLoading(true);
    try {
      const payload = tab === 'nin' ? { nin: value } : { bvn: value };
      const { data } = await profileApi.submitKyc(payload);
      setUser(data.data);
      toast.success('KYC submitted! We\'ll review within 24 hours.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-6">
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
            <p className="text-blue-700 text-sm">Submit your NIN or BVN to verify your identity and unlock higher transaction limits.</p>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Why verify?</p>
          {[
            'Higher daily transaction limits',
            'Faster dispute resolution',
            'Access to agent & premium features',
            'Regulatory compliance (CBN)',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 py-1.5">
              <ShieldCheck size={15} className="text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>

        {/* Form — only show if not yet submitted */}
        {!alreadySubmitted && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            {/* NIN / BVN tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              {(['nin', 'bvn'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setValue(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">
                  {tab === 'nin' ? 'National Identification Number (NIN)' : 'Bank Verification Number (BVN)'}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="Enter 11-digit number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                <p className="text-xs text-gray-400 mt-1">{value.length}/11 digits</p>
              </div>

              <p className="text-xs text-gray-400">
                Your information is encrypted and used only for identity verification. We do not share it with third parties.
              </p>

              <Button
                fullWidth
                loading={loading}
                onClick={handleSubmit}
                disabled={value.length !== 11}
              >
                Submit {tab.toUpperCase()} for Verification
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
