'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { airtimeApi } from '@/lib/api';
import { getErrorMessage, networkColors } from '@/lib/utils';
import type { Network } from '@/types';
import { cn } from '@/lib/cn';

const NETWORKS: Network[] = ['MTN', 'Airtel', 'Glo', '9mobile'];
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

interface AirtimeForm {
  phone: string;
  amount: string;
}

export default function AirtimePage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>('MTN');
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState<AirtimeForm | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AirtimeForm>();

  const onSubmit = (data: AirtimeForm) => {
    setFormData(data);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!formData) return;
    setLoading(true);
    try {
      await airtimeApi.buy(network, formData.phone, parseFloat(formData.amount), pin);
      toast.success(`₦${formData.amount} ${network} airtime sent to ${formData.phone}!`);
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
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-400 to-orange-400 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-2xl font-black">Buy Airtime</h1>
        <p className="text-yellow-100 text-sm">Instant recharge, all networks</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          {/* Network selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Network</label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    network === n ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-100 text-gray-600',
                    networkColors[n]?.split(' ')[0] ?? ''
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {!showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Phone Number"
                placeholder="0812 345 6789"
                type="tel"
                error={errors.phone?.message}
                {...register('phone', { required: 'Phone is required', pattern: { value: /^\+?[0-9]{10,14}$/, message: 'Invalid phone' } })}
              />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (₦)</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setValue('amount', a.toString())}
                      className={cn(
                        'py-2 rounded-xl text-sm font-semibold border transition-all',
                        watch('amount') === a.toString()
                          ? 'border-brand-blue bg-blue-50 text-brand-blue'
                          : 'border-gray-100 text-gray-700 bg-gray-50'
                      )}
                    >
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Or enter custom amount"
                  type="number"
                  min={50}
                  max={50000}
                  error={errors.amount?.message}
                  {...register('amount', { required: 'Amount is required', min: { value: 50, message: 'Min ₦50' }, max: { value: 50000, message: 'Max ₦50,000' } })}
                />
              </div>

              <Button type="submit" fullWidth size="lg">
                Continue
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-gray-500 text-sm">Sending <strong>₦{formData?.amount}</strong> airtime to</p>
                <p className="font-bold text-gray-900">{formData?.phone} ({network})</p>
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
