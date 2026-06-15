'use client';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { User, Copy, LogOut, ChevronRight, Shield, Bell, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MenuItem = ({ icon: Icon, label, href, danger }: { icon: React.ElementType; label: string; href?: string; danger?: boolean }) => {
  const content = (
    <div className={`flex items-center gap-3 p-4 ${danger ? 'text-red-500' : 'text-gray-700'}`}>
      <Icon size={20} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="text-gray-300" />
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return <div>{content}</div>;
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const copyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast.success('Referral code copied!');
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-black">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
            <p className="text-blue-300 text-sm">{user?.email?.address}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-brand-blue/30 text-blue-200 text-xs rounded-full capitalize">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 flex flex-col gap-4 pb-8">
        {/* Referral card */}
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-gray-500">Your Referral Code</p>
            <p className="text-lg font-black text-brand-blue tracking-widest">{user?.referralCode}</p>
          </div>
          <button onClick={copyReferral} className="flex items-center gap-1.5 text-sm text-brand-blue font-semibold bg-blue-50 px-3 py-2 rounded-xl">
            <Copy size={14} /> Copy
          </button>
        </div>

        {/* Phone */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Phone Number</p>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{user?.phone?.number}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.phone?.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {user?.phone?.verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          <MenuItem icon={Shield} label="Security & PIN" href="/profile/security" />
          <MenuItem icon={Bell} label="Notifications" href="/profile/notifications" />
          <MenuItem icon={HelpCircle} label="Help & Support" href="/profile/support" />
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-4 text-red-500"
          >
            <LogOut size={20} />
            <span className="flex-1 text-left text-sm font-medium">Sign Out</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-2">PayPoint v1.0.0</p>
      </div>
    </div>
  );
}
