'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Grid3X3, History, User, LogOut, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/services', label: 'Services', icon: Grid3X3 },
  { href: '/transactions', label: 'History', icon: History },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useAuthStore();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50">
        <Link href="/home" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span className="text-gray-900 font-black text-xl tracking-tight">PayPoint</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                active
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin link */}
      {(user?.role === 'admin' || user?.role === 'developer') && (
        <div className="px-3 pb-2">
          <Link href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <ShieldCheck size={17} strokeWidth={1.8} />
            <span className="text-sm font-medium">Admin Panel</span>
          </Link>
        </div>
      )}

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-50">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 min-w-0">
          <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email?.address}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut size={17} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
