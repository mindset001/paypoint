'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface Prefs {
  transactionAlerts: boolean;
  fundingAlerts: boolean;
  promoOffers: boolean;
  securityAlerts: boolean;
  weeklyStatement: boolean;
}

const DEFAULTS: Prefs = {
  transactionAlerts: true,
  fundingAlerts: true,
  promoOffers: false,
  securityAlerts: true,
  weeklyStatement: false,
};

const ITEMS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: 'transactionAlerts', label: 'Transaction Alerts', desc: 'Get notified for every debit and credit' },
  { key: 'fundingAlerts', label: 'Wallet Funding', desc: 'Alerts when your wallet is funded' },
  { key: 'securityAlerts', label: 'Security Alerts', desc: 'Login attempts and password changes' },
  { key: 'promoOffers', label: 'Promotions & Offers', desc: 'Discounts, cashbacks and special deals' },
  { key: 'weeklyStatement', label: 'Weekly Statement', desc: 'Summary of your weekly activity' },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  const toggle = (key: keyof Prefs) => {
    setPrefs((p) => {
      const updated = { ...p, [key]: !p[key] };
      toast.success(`${!p[key] ? 'Enabled' : 'Disabled'}`);
      return updated;
    });
  };

  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-6">
        <button onClick={() => router.back()} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold">Notifications</h1>
        <p className="text-blue-300 text-sm mt-1">Choose what you want to hear about</p>
      </div>

      <div className="px-4 py-5">
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {ITEMS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
              </div>
              <Toggle on={prefs[key]} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Notification delivery requires SMS or push permissions.
        </p>
      </div>
    </div>
  );
}
