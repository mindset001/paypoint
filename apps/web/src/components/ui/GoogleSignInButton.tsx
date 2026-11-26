'use client';
import { useEffect, useRef, useState } from 'react';
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

const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Google's own Identity Services button (used below for plain web) is
// blocked inside an embedded WebView — Google detects it and refuses to
// show the sign-in screen ("disallowed_useragent"). Inside the Capacitor
// shell this uses the real native Google Sign-In SDK instead via
// @capgo/capacitor-social-login, which opens a proper system auth flow.
function NativeGoogleButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!IOS_CLIENT_ID) return;
    setLoading(true);
    try {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      await SocialLogin.initialize({
        google: { iOSClientId: IOS_CLIENT_ID, webClientId: WEB_CLIENT_ID },
      });
      const { result } = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
      if ('idToken' in result && result.idToken) {
        onCredential(result.idToken);
      }
    } catch {
      // USER_CANCELLED (tapped away) or a real failure — either way there's
      // nothing actionable to show beyond just not being signed in.
    } finally {
      setLoading(false);
    }
  };

  if (!IOS_CLIENT_ID) return null; // native iOS client ID not configured yet

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.5l6.3 5.3C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
      </svg>
      {loading ? 'Signing in…' : 'Continue with Google'}
    </button>
  );
}

function WebGoogleButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);

  const renderButton = () => {
    if (!WEB_CLIENT_ID || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: WEB_CLIENT_ID,
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

  if (!WEB_CLIENT_ID) return null; // not configured yet — nothing to render

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={renderButton} />
      <div ref={buttonRef} className="flex justify-center w-full" />
    </>
  );
}

export function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const [isNative, setIsNative] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    import('@capacitor/core')
      .then(({ Capacitor }) => setIsNative(Capacitor.isNativePlatform()))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;
  return isNative ? <NativeGoogleButton onCredential={onCredential} /> : <WebGoogleButton onCredential={onCredential} />;
}
