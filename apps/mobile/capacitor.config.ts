import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ng.paycen.app',
  appName: 'Paycen',
  webDir: 'www',
  // Loads the live Next.js app directly instead of bundling a static
  // export — the web app has no server routes/middleware to worry about
  // (every page is a client component calling the separate Express API),
  // so this is a thin native shell that always reflects the real deploy
  // with zero extra build step and no app-store resubmission for content
  // changes. Only an actual native-code change (new plugin, icon, etc.)
  // ever needs a new store submission.
  //
  // Starts at /login, not the marketing landing page — someone who
  // installed the app from the store doesn't need the pitch, and an
  // already-signed-in session (see login/page.tsx) bounces straight to
  // /home from here anyway.
  server: {
    url: 'https://paypoint-web.vercel.app/login',
    cleartext: false,
  },
};

export default config;
