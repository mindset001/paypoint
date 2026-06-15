import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
        <span className="text-4xl font-black text-brand-blue">?</span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/home"
        className="bg-brand-blue text-white font-semibold px-6 py-3 rounded-2xl hover:bg-primary-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
