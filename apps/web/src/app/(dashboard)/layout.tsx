'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { BottomNav } from '@/components/ui/BottomNav';
import { Sidebar } from '@/components/ui/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto hide-scrollbar">
          {/* Constrain content width on desktop */}
          <div className="lg:max-w-3xl lg:mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile-only bottom nav */}
        <BottomNav />
      </div>
    </div>
  );
}
