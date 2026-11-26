'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/utils';

export default function AddPhonePage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = /^\+?[0-9]{10,14}$/.test(phone);

  const handleSubmit = async () => {
    if (!valid) { toast.error('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.addPhone(phone);
      setUser(data.data);
      toast.success('Phone number added!');
      router.push('/home');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <Phone size={28} className="text-brand-blue" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Add your phone number</h1>
      <p className="text-gray-500 text-sm mb-8">
        You signed up with Google, which doesn&apos;t give us a phone number — we need one for account recovery and support.
      </p>

      <input
        type="tel"
        inputMode="tel"
        placeholder="08012345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg text-center font-mono tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />

      <Button fullWidth size="lg" loading={loading} disabled={!valid} onClick={handleSubmit} className="mt-6">
        Continue
      </Button>
    </div>
  );
}
