require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/paycen',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

  AIDAPAY_BASE_URL: process.env.AIDAPAY_BASE_URL,
  AIDAPAY_API_KEY: process.env.AIDAPAY_API_KEY,
  AIDAPAY_USERNAME: process.env.AIDAPAY_USERNAME,
  AIDAPAY_PASSWORD: process.env.AIDAPAY_PASSWORD,
  // The 4-digit PIN on AidaPay's own merchant account, required by their
  // POST /buy — unrelated to a Paycen user's wallet PIN.
  AIDAPAY_ACCOUNT_PIN: process.env.AIDAPAY_ACCOUNT_PIN,

  // eSIM Access (esimaccess.com) — HMAC-signed auth (access code + secret
  // key, not a single bearer token); see providers/esim/esimAccess.client.js.
  ESIM_ACCESS_BASE_URL: process.env.ESIM_ACCESS_BASE_URL,
  ESIM_ACCESS_CODE: process.env.ESIM_ACCESS_CODE,
  ESIM_ACCESS_SECRET_KEY: process.env.ESIM_ACCESS_SECRET_KEY,

  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,

  FLUTTERWAVE_SECRET_KEY:  process.env.FLUTTERWAVE_SECRET_KEY,
  FLUTTERWAVE_PUBLIC_KEY:  process.env.FLUTTERWAVE_PUBLIC_KEY,
  FLUTTERWAVE_SECRET_HASH: process.env.FLUTTERWAVE_SECRET_HASH,

  MONNIFY_API_KEY:       process.env.MONNIFY_API_KEY,
  MONNIFY_SECRET_KEY:    process.env.MONNIFY_SECRET_KEY,
  MONNIFY_CONTRACT_CODE: process.env.MONNIFY_CONTRACT_CODE,
  MONNIFY_BASE_URL:      process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com',

  TERMII_API_KEY: process.env.TERMII_API_KEY,
  TERMII_SENDER_ID: process.env.TERMII_SENDER_ID || 'Paycen',

  // Default to sandbox — switch DOJAH_BASE_URL to https://api.dojah.io
  // with live keys only when actually going to production.
  DOJAH_BASE_URL:   process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io',
  DOJAH_SECRET_KEY: process.env.DOJAH_SECRET_KEY,
  DOJAH_APP_ID:     process.env.DOJAH_APP_ID,

  // Resend's HTTP API, not their SMTP relay — Render (and most PaaS hosts)
  // block outbound SMTP ports, which silently hung every OTP-sending
  // request. RESEND_API_KEY falls back to SMTP_PASS because Resend's SMTP
  // relay auth password *is* the API key, so this picks up the existing
  // value with no env var changes needed wherever SMTP_PASS was already set.
  RESEND_API_KEY: process.env.RESEND_API_KEY || process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@paycen.ng',

  SENTRY_DSN: process.env.SENTRY_DSN,

  // Web OAuth client ID from Google Cloud Console — verifies the ID token
  // "Sign in with Google" hands us client-side (see auth.service.js#googleAuth).
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
};

const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!env[key]) {
    console.warn(`Warning: ${key} is not set in environment variables`);
  }
}

module.exports = env;
