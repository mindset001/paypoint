'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { cableApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

const PROVIDERS = [
  { id: 'DSTV', name: 'DStv', color: 'from-blue-600 to-blue-800' },
  { id: 'GOTV', name: 'GOtv', color: 'from-green-500 to-green-700' },
  { id: 'STARTIMES', name: 'Startimes', color: 'from-red-500 to-red-700' },
];

interface VerifiedCard { name: string; currentPackage: string }
interface Plan { planCode: string; name: string; amount: number }
interface CableForm { smartcardNumber: string }

export default function CablePage() {
  const router = useRouter();
  const [provider, setProvider] = useState('DSTV');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [verified, setVerified] = useState<VerifiedCard | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [smartcard, setSmartcard] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm<CableForm>();

  useEffect(() => {
    cableApi.plans(provider).then(({ data }) => setPlans(data.data || [])).catch(() => setPlans([]));
    setVerified(null);
    setSelectedPlan(null);
  }, [provider]);

  const onVerify = async (data: CableForm) => {
    setVerifying(true);
    try {
      const res = await cableApi.verify(provider, data.smartcardNumber);
      setVerified(res.data.data);
      setSmartcard(data.smartcardNumber);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setVerifying(false); }
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      await cableApi.subscribe(provider, smartcard, selectedPlan.planCode, selectedPlan.amount, pin);
      toast.success(`${provider} subscription successful!`);
      router.push('/home');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Cable TV</h1>
        <p className="text-purple-100 text-sm">DStv, GOtv, Startimes</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => setProvider(p.id)}
                className={cn('py-3 rounded-xl text-sm font-bold border-2 transition-all',
                  provider === p.id ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-600')}>
                {p.name}
              </button>
            ))}
          </div>

          {!showPin ? (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSubmit(onVerify)} className="flex gap-2">
                <Input
                  placeholder="Smartcard / IUC Number"
                  error={errors.smartcardNumber?.message}
                  className="flex-1"
                  {...register('smartcardNumber', { required: 'Required' })}
                />
                <Button type="submit" loading={verifying} size="md">Verify</Button>
              </form>

              {verified && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{verified.name}</p>
                    <p className="text-xs text-gray-500">Current: {verified.currentPackage}</p>
                  </div>
                </div>
              )}

              {verified && plans.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Select Package</label>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto hide-scrollbar">
                    {plans.map((p) => (
                      <button key={p.planCode} type="button" onClick={() => setSelectedPlan(p)}
                        className={cn('p-3 rounded-xl border-2 text-left transition-all flex justify-between items-center',
                          selectedPlan?.planCode === p.planCode ? 'border-purple-600 bg-purple-50' : 'border-gray-100')}>
                        <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                        <span className="text-sm font-black text-purple-700">₦{p.amount.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {verified && selectedPlan && (
                <Button fullWidth size="lg" onClick={() => setShowPin(true)}>Pay ₦{selectedPlan.amount.toLocaleString()}</Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Subscribing <strong>{verified?.name}</strong> to</p>
                <p className="font-bold text-gray-900">{selectedPlan?.name}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-gray-400 underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
