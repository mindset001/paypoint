'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

interface LoginForm {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const user = await login(data.identifier, data.password);
      toast.success(`Welcome back, ${user.firstName}!`);
      if (!user.phone?.verified) {
        router.push('/verify-otp?identifier=' + encodeURIComponent(data.identifier));
      } else {
        router.push('/home');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
      <p className="text-gray-500 text-sm mb-8">Sign in to your PayPoint account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Phone or Email"
          placeholder="08012345678 or email@example.com"
          type="text"
          error={errors.identifier?.message}
          {...register('identifier', { required: 'Phone or email is required' })}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          type={showPw ? 'text' : 'password'}
          error={errors.password?.message}
          suffix={
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-brand-blue font-medium">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-2">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand-blue font-semibold">
          Create one
        </Link>
      </p>
    </div>
  );
}
