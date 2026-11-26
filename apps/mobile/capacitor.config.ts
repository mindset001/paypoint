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
  // Kept visible (no auto-hide, no fixed timer) until the web app itself
  // calls SplashScreen.hide() — see components/AppSplash.tsx — so there's
  // no blank/white gap while the remote page loads, and the handoff from
  // this static native image into the animated web splash is a clean
  // crossfade instead of two separate loading moments.
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
