require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/paypoint',
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
  TERMII_SENDER_ID: process.env.TERMII_SENDER_ID || 'PayPoint',

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@paypoint.ng',
};

const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!env[key]) {
    console.warn(`Warning: ${key} is not set in environment variables`);
  }
}

module.exports = env;
