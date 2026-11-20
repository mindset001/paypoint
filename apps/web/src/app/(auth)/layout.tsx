import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-dark to-brand-navy flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-12 pb-4 lg:pt-16">
        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-lg">
          <Image src="/icons/wordmark.png" alt="Paycen" width={160} height={41} priority className="h-[38px] w-auto" />
        </div>
      </div>

      {/* Mobile: full-width slide-up card */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl mt-4 px-6 pt-8 pb-6 overflow-y-auto lg:hidden">
        {children}
      </div>

      {/* Desktop: centered card over gradient background */}
      <div className="hidden lg:flex flex-1 items-start justify-center pt-4 pb-16 px-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/20 px-8 py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
