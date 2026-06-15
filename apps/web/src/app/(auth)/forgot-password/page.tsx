'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { securityApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

type Step = 'identifier' | 'otp' | 'password';

interface IdentifierForm { identifier: string }
interface PasswordForm { newPassword: string; confirmPassword: string }

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const identifierForm = useForm<IdentifierForm>();
  const passwordForm = useForm<PasswordForm>();

  const onSendOtp = async (data: IdentifierForm) => {
    setLoading(true);
    try {
      const res = await securityApi.forgotPassword(data.identifier);
      setIdentifier(data.identifier);
      if (res.data.data.devOtp) setDevOtp(res.data.data.devOtp);
      toast.success('Reset code sent');
      setStep('otp');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onOtpComplete = (code: string) => {
    setOtp(code);
    setStep('password');
  };

  const onResetPassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await securityApi.resetPassword(identifier, otp, data.newPassword);
      toast.success('Password reset! Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/login" className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-6">
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      {step === 'identifier' && (
        <>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Forgot password?</h1>
          <p className="text-gray-500 text-sm mb-8">Enter your phone or email and we&apos;ll send a reset code.</p>
          <form onSubmit={identifierForm.handleSubmit(onSendOtp)} className="flex flex-col gap-4">
            <Input
              label="Phone or Email"
              placeholder="08012345678 or email@example.com"
              error={identifierForm.formState.errors.identifier?.message}
              {...identifierForm.register('identifier', { required: 'This field is required' })}
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Send reset code
            </Button>
          </form>
        </>
      )}

      {step === 'otp' && (
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Enter reset code</h1>
          <p className="text-gray-500 text-sm mb-2">
            We sent a 6-digit code to <strong className="text-gray-700">{identifier}</strong>
          </p>
          {devOtp && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-6">
              Dev OTP: <strong>{devOtp}</strong>
            </p>
          )}
          {!devOtp && <div className="mb-6" />}
          <div className="w-full">
            <PinInput length={6} onComplete={onOtpComplete} label="Enter 6-digit code" />
          </div>
          <button onClick={() => setStep('identifier')} className="mt-6 text-sm text-gray-400 underline">
            Use a different identifier
          </button>
        </div>
      )}

      {step === 'password' && (
        <>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Set new password</h1>
          <p className="text-gray-500 text-sm mb-8">Choose a strong password for your account.</p>
          <form onSubmit={passwordForm.handleSubmit(onResetPassword)} className="flex flex-col gap-4">
            <Input
              label="New Password"
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              type={showPw ? 'text' : 'password'}
              error={passwordForm.formState.errors.newPassword?.message}
              suffix={
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              {...passwordForm.register('newPassword', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
                pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Must have uppercase & number' },
              })}
            />
            <Input
              label="Confirm Password"
              placeholder="Re-enter new password"
              type={showPw ? 'text' : 'password'}
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword', { required: 'Please confirm your password' })}
            />
            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Reset Password
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
