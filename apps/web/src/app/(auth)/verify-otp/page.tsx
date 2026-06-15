'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { PinInput } from '@/components/ui/PinInput';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

function VerifyOtpContent() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const identifier = params.get('identifier') || '';
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(identifier, pin);
      const { user, accessToken, refreshToken } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      toast.success('Phone verified!');
      if (!user.pinHash) {
        router.push('/set-pin');
      } else {
        router.push('/home');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendOtp(identifier);
      toast.success('OTP resent');
      setCountdown(60);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">📱</span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Verify your phone</h1>
      <p className="text-gray-500 text-sm mb-8">
        We sent a 6-digit code to<br />
        <strong className="text-gray-700">{identifier}</strong>
      </p>

      <div className="w-full mb-6">
        <PinInput length={6} onComplete={setPin} label="Enter OTP" />
      </div>

      <Button fullWidth size="lg" loading={loading} onClick={handleSubmit} disabled={pin.length < 6}>
        Verify OTP
      </Button>

      <div className="mt-6">
        {countdown > 0 ? (
          <p className="text-sm text-gray-400">Resend OTP in <strong>{countdown}s</strong></p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-brand-blue font-semibold disabled:opacity-50"
          >
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpContent />
    </Suspense>
  );
}
