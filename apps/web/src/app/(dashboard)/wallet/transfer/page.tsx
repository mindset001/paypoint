'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { walletApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

interface TransferForm { recipient: string; amount: string }

export default function TransferPage() {
  const router = useRouter();
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState<TransferForm | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TransferForm>();

  const onSubmit = (data: TransferForm) => {
    setFormData(data);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!formData) return;
    setLoading(true);
    try {
      await walletApi.transfer(formData.recipient, parseFloat(formData.amount), pin);
      toast.success('Transfer successful!');
      router.push('/wallet');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-green-600 to-green-800 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Transfer</h1>
        <p className="text-green-100 text-sm">Send money to another PayPoint user</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          {!showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Recipient (Phone or Email)"
                placeholder="08012345678 or email@example.com"
                error={errors.recipient?.message}
                {...register('recipient', { required: 'Recipient is required' })}
              />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (₦)</label>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {QUICK_AMOUNTS.map((a) => (
                    <button type="button" key={a} onClick={() => setValue('amount', a.toString())}
                      className={cn('py-2 rounded-xl text-xs font-semibold border transition-all',
                        watch('amount') === a.toString() ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-100 text-gray-700')}>
                      ₦{a >= 1000 ? (a/1000)+'k' : a}
                    </button>
                  ))}
                </div>
                <Input placeholder="Enter amount" type="number" min={100}
                  error={errors.amount?.message}
                  {...register('amount', { required: 'Amount required', min: { value: 100, message: 'Min ₦100' } })} />
              </div>
              <Button type="submit" fullWidth size="lg">Continue</Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Sending to <strong>{formData?.recipient}</strong></p>
                <p className="text-2xl font-black text-gray-900">₦{parseFloat(formData?.amount || '0').toLocaleString()}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-gray-400 underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
