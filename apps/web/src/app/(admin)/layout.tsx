'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Zap, LayoutDashboard, Users, ArrowLeftRight, ChevronRight, LogOut, Home } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const NAV = [
  { href: '/admin',              icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/users',        icon: Users,           label: 'Users' },
  { href: '/admin/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, _hasHydrated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'admin' && user.role !== 'developer') {
      router.replace('/home');
    }
  }, [user, _hasHydrated, router]);

  if (!_hasHydrated || !user) return null;
  if (user.role !== 'admin' && user.role !== 'developer') return null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">PayPoint</p>
              <p className="text-slate-500 text-xs mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <Link href="/home"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <Home size={17} />
            Main App
          </Link>
          <button onClick={() => { clearAuth(); router.push('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
