'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { PinInput } from '@/components/ui/PinInput';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function SetPinPage() {
  const router = useRouter();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFirstPin = (p: string) => {
    setFirstPin(p);
    setStep('confirm');
    setPin('');
  };

  const handleConfirmPin = async (confirmPin: string) => {
    if (confirmPin !== firstPin) {
      toast.error('PINs do not match. Try again.');
      setStep('create');
      setFirstPin('');
      return;
    }
    setLoading(true);
    try {
      await authApi.setPin(confirmPin, confirmPin);
      toast.success('Transaction PIN set!');
      router.push('/home');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">🔐</span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">
        {step === 'create' ? 'Set Transaction PIN' : 'Confirm your PIN'}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        {step === 'create'
          ? 'This PIN will authorize all transactions'
          : 'Enter your PIN again to confirm'}
      </p>

      {step === 'create' ? (
        <PinInput key="create" length={4} onComplete={handleFirstPin} label="Enter 4-digit PIN" />
      ) : (
        <PinInput key="confirm" length={4} onComplete={handleConfirmPin} label="Confirm PIN" />
      )}

      {step === 'confirm' && (
        <button
          onClick={() => { setStep('create'); setFirstPin(''); }}
          className="mt-6 text-sm text-gray-500 underline"
        >
          Start over
        </button>
      )}

      {loading && (
        <div className="mt-6">
          <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}
    </div>
  );
}
