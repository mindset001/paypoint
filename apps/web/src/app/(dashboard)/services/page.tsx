'use client';
import Link from 'next/link';
import { Phone, Wifi, Tv, Zap, BookOpen } from 'lucide-react';

const SERVICES = [
  {
    id: 'airtime',
    name: 'Airtime',
    desc: 'Recharge any network instantly',
    icon: Phone,
    color: 'bg-yellow-50 text-yellow-600',
    border: 'border-yellow-100',
    gradient: 'from-yellow-400 to-orange-400',
  },
  {
    id: 'data',
    name: 'Data',
    desc: 'SME & corporate data bundles',
    icon: Wifi,
    color: 'bg-blue-50 text-blue-600',
    border: 'border-blue-100',
    gradient: 'from-brand-blue to-blue-700',
  },
  {
    id: 'cable',
    name: 'Cable TV',
    desc: 'DStv, GOtv, Startimes',
    icon: Tv,
    color: 'bg-purple-50 text-purple-600',
    border: 'border-purple-100',
    gradient: 'from-purple-600 to-purple-800',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    desc: 'Prepaid & postpaid meters',
    icon: Zap,
    color: 'bg-orange-50 text-orange-600',
    border: 'border-orange-100',
    gradient: 'from-orange-500 to-orange-700',
  },
  {
    id: 'exam',
    name: 'Exam Pins',
    desc: 'WAEC, NECO, NABTEB, JAMB',
    icon: BookOpen,
    color: 'bg-green-50 text-green-600',
    border: 'border-green-100',
    gradient: 'from-green-600 to-green-800',
  },
];

export default function ServicesPage() {
  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-6">
        <h1 className="text-white text-xl font-bold">Services</h1>
        <p className="text-blue-300 text-sm mt-1">Everything you need, one wallet</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-3">
        {SERVICES.map(({ id, name, desc, icon: Icon, color, border, gradient }) => (
          <Link
            key={id}
            href={`/${id}`}
            className={`bg-white rounded-2xl border ${border} p-4 flex items-center gap-4 hover:shadow-md active:scale-[0.98] transition-all`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{name}</p>
              <p className="text-gray-400 text-sm mt-0.5">{desc}</p>
            </div>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-lg font-bold leading-none">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
