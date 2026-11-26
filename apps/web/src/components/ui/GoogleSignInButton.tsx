'use client';
import { useEffect, useRef } from 'react';
import Script from 'next/script';

// Declared ad hoc rather than pulling in a full @types package for one
// narrow surface — Google's Identity Services script attaches this global,
// there's no npm module whose types we'd otherwise need.
interface GoogleCredentialResponse {
  credential: string;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);

  const renderButton = () => {
    if (!CLIENT_ID || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
    });
  };

  useEffect(() => {
    // The script may already be loaded (e.g. back-navigation) — Script's
    // onLoad only fires once per actual load, so this covers that case too.
    if (window.google) renderButton();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null; // not configured yet — nothing to render

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={renderButton} />
      <div ref={buttonRef} className="flex justify-center w-full" />
    </>
  );
}
