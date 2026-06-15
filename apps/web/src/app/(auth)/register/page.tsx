'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authApi.register(data);
      toast.success('Account created! Please verify your phone.');
      router.push('/verify-otp?identifier=' + encodeURIComponent(data.phone));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Create account</h1>
      <p className="text-gray-500 text-sm mb-8">Join millions using PayPoint daily</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            placeholder="John"
            error={errors.firstName?.message}
            {...register('firstName', { required: 'Required' })}
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            error={errors.lastName?.message}
            {...register('lastName', { required: 'Required' })}
          />
        </div>

        <Input
          label="Email Address"
          placeholder="john@example.com"
          type="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
          })}
        />

        <Input
          label="Phone Number"
          placeholder="08012345678"
          type="tel"
          error={errors.phone?.message}
          {...register('phone', { required: 'Phone is required', pattern: { value: /^\+?[0-9]{10,14}$/, message: 'Invalid phone' } })}
        />

        <Input
          label="Password"
          placeholder="Min. 8 chars, 1 uppercase, 1 number"
          type={showPw ? 'text' : 'password'}
          error={errors.password?.message}
          suffix={
            <button type="button" onClick={() => setShowPw(!showPw)} className="cursor-pointer text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Minimum 8 characters' },
            pattern: { value: /(?=.*[A-Z])(?=.*[0-9])/, message: 'Must have uppercase & number' },
          })}
        />

        <Input
          label="Referral Code (Optional)"
          placeholder="Enter referral code"
          {...register('referralCode')}
        />

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-4">
        By signing up you agree to our Terms & Privacy Policy
      </p>
      <p className="text-center text-sm text-gray-500 mt-3">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-blue font-semibold">Sign in</Link>
      </p>
    </div>
  );
}
