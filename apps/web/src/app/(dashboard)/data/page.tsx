'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { dataApi } from '@/lib/api';
import { getErrorMessage, networkColors } from '@/lib/utils';
import type { Network } from '@/types';
import { cn } from '@/lib/cn';

const NETWORKS: Network[] = ['MTN', 'Airtel', 'Glo', '9mobile'];

interface Plan { planId: string; name: string; amount: number; validity: string }
interface DataForm { phone: string }

export default function DataPage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>('MTN');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<DataForm>();

  useEffect(() => {
    setLoadingPlans(true);
    dataApi.plans(network)
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, [network]);

  const onSubmit = (data: DataForm) => {
    if (!selectedPlan) { toast.error('Select a data plan'); return; }
    setPhone(data.phone);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      await dataApi.buy(network, phone, selectedPlan.planId, selectedPlan.amount, pin);
      toast.success(`${selectedPlan.name} sent to ${phone}!`);
      router.push('/home');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Buy Data</h1>
        <p className="text-blue-100 text-sm">All networks, best prices</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Network</label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => (
                <button key={n} onClick={() => setNetwork(n)}
                  className={cn('py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    network === n ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-100 text-gray-600')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {!showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Phone Number" placeholder="0812 345 6789" type="tel"
                error={errors.phone?.message}
                {...register('phone', { required: 'Phone is required' })}
              />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Plan</label>
                {loadingPlans ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No plans available</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto hide-scrollbar">
                    {plans.map((p) => (
                      <button type="button" key={p.planId} onClick={() => setSelectedPlan(p)}
                        className={cn('p-3 rounded-xl border-2 text-left transition-all',
                          selectedPlan?.planId === p.planId ? 'border-brand-blue bg-blue-50' : 'border-gray-100')}>
                        <p className="text-xs font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.validity}</p>
                        <p className="text-sm font-black text-brand-blue mt-1">₦{(p.amount).toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" fullWidth size="lg">Continue</Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-gray-500 text-sm">Sending <strong>{selectedPlan?.name}</strong> to</p>
                <p className="font-bold text-gray-900">{phone} ({network})</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-gray-400 underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
