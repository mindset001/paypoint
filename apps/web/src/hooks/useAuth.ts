'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { user, isAuthenticated, setAuth, setUser, clearAuth } = useAuthStore();
  const router = useRouter();

  const login = useCallback(async (identifier: string, password: string) => {
    const { data } = await authApi.login(identifier, password);
    const { user: u, accessToken, refreshToken } = data.data;
    setAuth(u, accessToken, refreshToken);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return u;
  }, [setAuth]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    localStorage.clear();
    router.push('/login');
  }, [clearAuth, router]);

  const fetchMe = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data.data.user);
    return data.data.user;
  }, [setUser]);

  return { user, isAuthenticated, login, logout, fetchMe };
};
