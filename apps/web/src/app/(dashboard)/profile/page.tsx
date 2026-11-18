'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { User, Copy, LogOut, ChevronRight, Shield, Bell, HelpCircle, Pencil, Check, X, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { profileApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const MenuItem = ({ icon: Icon, label, href, danger }: { icon: React.ElementType; label: string; href?: string; danger?: boolean }) => {
  const content = (
    <div className={`flex items-center gap-3 p-4 ${danger ? 'text-red-500' : 'text-ink-muted'}`}>
      <Icon size={20} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="text-ink-muted/60" />
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return <div>{content}</div>;
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName]   = useState(user?.lastName  ?? '');
  const [saving, setSaving] = useState(false);

  const copyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const startEdit = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName   ?? '');
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const { data } = await profileApi.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setUser(data.data);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const kycStatus = user?.status === 'pending_kyc'
    ? 'Under Review'
    : user?.kycSubmittedAt
    ? 'Verified'
    : 'Not Submitted';

  const kycColor = user?.status === 'pending_kyc'
    ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10'
    : user?.kycSubmittedAt
    ? 'text-green-600 bg-green-50 dark:bg-green-500/10'
    : 'text-ink-muted bg-surface-2';

  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-8">
        <div className="flex justify-end mb-2 md:hidden">
          <ThemeToggle className="bg-white/10 text-white/70 hover:text-white" />
        </div>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl font-black">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none border border-white/20 focus:border-white/60"
                  />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none border border-white/20 focus:border-white/60"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg disabled:opacity-60">
                    <Check size={12} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white/70 text-xs font-bold rounded-lg">
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-white text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
                  <button onClick={startEdit} className="text-white/50 hover:text-white transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-blue-300 text-sm">{user?.email?.address}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-brand-blue/30 text-blue-200 text-xs rounded-full capitalize">
                  {user?.role}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 flex flex-col gap-4 pb-8">
        {/* Referral card */}
        <div className="bg-surface rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-ink-muted">Your Referral Code</p>
            <p className="text-lg font-black text-brand-blue tracking-widest">{user?.referralCode}</p>
          </div>
          <button onClick={copyReferral} className="flex items-center gap-1.5 text-sm text-brand-blue font-semibold bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-xl">
            <Copy size={14} /> Copy
          </button>
        </div>

        {/* Phone */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-ink-muted mb-1">Phone Number</p>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink">{user?.phone?.number}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.phone?.verified ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'}`}>
              {user?.phone?.verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>

        {/* KYC status card */}
        <Link href="/profile/kyc" className="bg-surface rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
              <FileCheck size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Identity Verification (KYC)</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${kycColor}`}>
                {kycStatus}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-ink-muted/60" />
        </Link>

        {/* Menu */}
        <div className="bg-surface rounded-2xl shadow-sm divide-y divide-line">
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

        <p className="text-center text-xs text-ink-muted/70 mt-2">PayPoint v1.0.0</p>
      </div>
    </div>
  );
}
