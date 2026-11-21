'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, ArrowLeftRight, Settings, ChevronRight, LogOut, Home, ShieldAlert, ShieldCheck, History, Megaphone, Menu, X, Wifi } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const NAV = [
  { href: '/admin',                icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/users',          icon: Users,           label: 'Users' },
  { href: '/admin/transactions',   icon: ArrowLeftRight,  label: 'Transactions' },
  { href: '/admin/reconciliation', icon: ShieldAlert,     label: 'Reconciliation' },
  { href: '/admin/kyc',            icon: ShieldCheck,     label: 'KYC Review' },
  { href: '/admin/data-plans',     icon: Wifi,            label: 'Data Plans' },
  { href: '/admin/announcements',  icon: Megaphone,       label: 'Announcements' },
  { href: '/admin/audit-log',      icon: History,         label: 'Audit Log' },
  { href: '/admin/settings',       icon: Settings,        label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, _hasHydrated, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Collapse the mobile drawer whenever navigation actually happens.
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

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
      {/* Mobile top bar — sidebar is off-canvas below lg, this is what opens it */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white p-1 -ml-1">
          <Menu size={22} />
        </button>
        <div className="bg-white rounded-lg px-2 py-1">
          <Image src="/icons/wordmark.png" alt="Paycen" width={88} height={23} className="h-5 w-auto" />
        </div>
        <span className="w-[22px]" aria-hidden />
      </div>

      {/* Backdrop for the mobile drawer */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay drawer on mobile, sticky in-flow on desktop */}
      <aside className={`w-60 shrink-0 h-screen fixed lg:sticky top-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="bg-white rounded-xl px-2.5 py-1.5 inline-block mb-1.5 shadow-sm">
              <Image src="/icons/wordmark.png" alt="Paycen" width={104} height={27} className="h-[26px] w-auto" />
            </div>
            <p className="text-slate-500 text-xs">Admin Panel</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
      <main className="flex-1 min-h-screen overflow-y-auto pt-14 lg:pt-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
