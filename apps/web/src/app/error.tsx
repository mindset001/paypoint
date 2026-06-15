'use client';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
        <span className="text-4xl">⚠️</span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="bg-brand-blue text-white font-semibold px-6 py-3 rounded-2xl hover:bg-primary-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
