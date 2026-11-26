'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/utils';

interface LoginForm {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const { login, loginWithGoogle, user } = useAuth();
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  // A session persists across app restarts (localStorage) — someone who's
  // already signed in shouldn't see the login form again just for opening
  // the native app or revisiting this URL on web. A Google sign-up with no
  // phone yet goes to the add-phone gate instead, same as a fresh sign-in.
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) router.replace(user?.needsPhone ? '/add-phone' : '/home');
  }, [_hasHydrated, isAuthenticated, user?.needsPhone, router]);

  const routeAfterAuth = (u: { email?: { verified: boolean; address: string }; needsPhone: boolean }) => {
    if (!u.email?.verified) {
      router.push('/verify-otp?identifier=' + encodeURIComponent(u.email!.address));
    } else if (u.needsPhone) {
      router.push('/add-phone');
    } else {
      router.push('/home');
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const u = await login(data.identifier, data.password);
      toast.success(`Welcome back, ${u.firstName}!`);
      routeAfterAuth(u);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onGoogleCredential = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const u = await loginWithGoogle(idToken);
      toast.success(`Welcome, ${u.firstName}!`);
      routeAfterAuth(u);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
      <p className="text-gray-500 text-sm mb-8">Sign in to your Paycen account</p>

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

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className={googleLoading ? 'opacity-50 pointer-events-none' : ''}>
        <GoogleSignInButton onCredential={onGoogleCredential} />
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand-blue font-semibold">
          Create one
        </Link>
      </p>
    </div>
  );
}
