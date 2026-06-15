'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Grid3X3, History, User } from 'lucide-react';
import { cn } from '@/lib/cn';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/services', label: 'Services', icon: Grid3X3 },
  { href: '/transactions', label: 'History', icon: History },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
                active ? 'text-brand-blue' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn('text-xs', active ? 'font-semibold' : 'font-medium')}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
