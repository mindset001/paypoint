'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, Lock, Key } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { securityApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type PinStep = 'current' | 'new' | 'confirm';
type PinMode = 'change' | 'forgot-otp' | 'forgot-new' | 'forgot-confirm';

export default function SecurityPage() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [pinStep, setPinStep] = useState<PinStep>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [pinMode, setPinMode] = useState<PinMode>('change');
  const [pinOtp, setPinOtp] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const startForgotPin = async () => {
    setForgotLoading(true);
    try {
      await securityApi.forgotPin();
      toast.success('Reset code sent to your email');
      setPinMode('forgot-otp');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const cancelForgotPin = () => {
    setPinMode('change');
    setPinOtp('');
    setNewPin('');
  };

  const handleForgotStep = async (value: string) => {
    if (pinMode === 'forgot-otp') {
      setPinOtp(value);
      setPinMode('forgot-new');
    } else if (pinMode === 'forgot-new') {
      setNewPin(value);
      setPinMode('forgot-confirm');
    } else {
      if (value !== newPin) {
        toast.error('PINs do not match, try again');
        setPinMode('forgot-new');
        setNewPin('');
        return;
      }
      setPinLoading(true);
      try {
        await securityApi.resetPin(pinOtp, value);
        toast.success('PIN reset successfully');
        cancelForgotPin();
      } catch (err) {
        toast.error(getErrorMessage(err));
        cancelForgotPin();
      } finally {
        setPinLoading(false);
      }
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>();

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await securityApi.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  const handlePinStep = async (pin: string) => {
    if (pinStep === 'current') {
      setCurrentPin(pin);
      setPinStep('new');
    } else if (pinStep === 'new') {
      setNewPin(pin);
      setPinStep('confirm');
    } else {
      if (pin !== newPin) {
        toast.error('PINs do not match, try again');
        setPinStep('new');
        setNewPin('');
        return;
      }
      setPinLoading(true);
      try {
        await securityApi.changePin(currentPin, newPin);
        toast.success('PIN changed successfully');
        setPinStep('current');
        setCurrentPin('');
        setNewPin('');
      } catch (err) {
        toast.error(getErrorMessage(err));
        setPinStep('current');
        setCurrentPin('');
        setNewPin('');
      } finally {
        setPinLoading(false);
      }
    }
  };

  const pinLabels: Record<PinStep, string> = {
    current: 'Enter current 4-digit PIN',
    new: 'Enter new 4-digit PIN',
    confirm: 'Confirm new PIN',
  };

  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-6">
        <button onClick={() => router.back()} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold">Security & PIN</h1>
        <p className="text-blue-300 text-sm mt-1">Manage your password and transaction PIN</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Change Password */}
        <div className="bg-surface rounded-2xl p-5 border border-line">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Lock size={18} className="text-brand-blue" />
            </div>
            <div>
              <p className="font-bold text-ink">Change Password</p>
              <p className="text-xs text-ink-muted">Update your login password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onChangePassword)} className="flex flex-col gap-3">
            <Input
              label="Current Password"
              type={showCurrent ? 'text' : 'password'}
              placeholder="Enter current password"
              error={errors.currentPassword?.message}
              suffix={
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="text-ink-muted cursor-pointer hover:text-ink">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('currentPassword', { required: 'Current password is required' })}
            />
            <Input
              label="New Password"
              type={showNew ? 'text' : 'password'}
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              error={errors.newPassword?.message}
              suffix={
                <button type="button" onClick={() => setShowNew(!showNew)} className="text-ink-muted cursor-pointer hover:text-ink">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
                pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Must have uppercase & number' },
              })}
            />
            <Input
              label="Confirm New Password"
              type={showNew ? 'text' : 'password'}
              placeholder="Re-enter new password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', { required: 'Please confirm your password' })}
            />
            <Button type="submit" fullWidth loading={pwLoading} className="mt-1">
              Update Password
            </Button>
          </form>
        </div>

        {/* Change / Forgot PIN */}
        <div className="bg-surface rounded-2xl p-5 border border-line">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center">
              <Key size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-ink">{pinMode === 'change' ? 'Change Transaction PIN' : 'Reset Forgotten PIN'}</p>
              <p className="text-xs text-ink-muted">
                {pinMode === 'change'
                  ? `Step ${pinStep === 'current' ? 1 : pinStep === 'new' ? 2 : 3} of 3 — ${pinStep === 'current' ? 'verify current' : pinStep === 'new' ? 'enter new' : 'confirm new'}`
                  : pinMode === 'forgot-otp'
                    ? 'Enter the code sent to your email'
                    : pinMode === 'forgot-new'
                      ? 'Enter your new PIN'
                      : 'Confirm your new PIN'}
              </p>
            </div>
          </div>

          {pinMode === 'change' ? (
            <div className="flex flex-col items-center gap-4">
              <PinInput key={pinStep} length={4} onComplete={handlePinStep} label={pinLabels[pinStep]} />
              {pinLoading && <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />}
              {pinStep !== 'current' && (
                <button
                  onClick={() => { setPinStep('current'); setCurrentPin(''); setNewPin(''); }}
                  className="text-sm text-ink-muted underline"
                >
                  Start over
                </button>
              )}
              <button onClick={startForgotPin} disabled={forgotLoading} className="text-sm text-brand-blue font-semibold">
                {forgotLoading ? 'Sending code...' : 'Forgot PIN?'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <PinInput
                key={pinMode}
                length={pinMode === 'forgot-otp' ? 6 : 4}
                onComplete={handleForgotStep}
                label={pinMode === 'forgot-otp' ? 'Enter 6-digit code' : pinMode === 'forgot-new' ? 'Enter new 4-digit PIN' : 'Confirm new PIN'}
              />
              {pinLoading && <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />}
              <button onClick={cancelForgotPin} className="text-sm text-ink-muted underline">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
