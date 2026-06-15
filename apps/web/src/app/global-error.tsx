'use client';
import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-8">An unexpected error occurred.</p>
          <button
            onClick={reset}
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-2xl"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
