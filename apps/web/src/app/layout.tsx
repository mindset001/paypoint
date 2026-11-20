import type { Metadata, Viewport } from 'next';
import { type ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Paycen — Pay Bills & Buy Airtime',
  description: 'Buy airtime, data, pay electricity bills, cable TV and more with Paycen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Paycen',
  },
  icons: {
    apple: '/icons/icon-192.png',
    icon: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Runs before paint so the page never flashes the wrong theme on load.
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
`;

// The marketing landing page only makes sense for a first-time visitor in a
// browser tab — someone opening the installed PWA already knows what the
// app is, so skip straight to their dashboard (if still signed in) or the
// login screen. Runs before paint, same as the theme script, so there's no
// landing-page flash before the redirect.
const PWA_ENTRY_SCRIPT = `
  try {
    var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone && window.location.pathname === '/') {
      var hasToken = !!localStorage.getItem('accessToken');
      window.location.replace(hasToken ? '/home' : '/login');
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PWA_ENTRY_SCRIPT }} />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
