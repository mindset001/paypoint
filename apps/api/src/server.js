require('dotenv').config();

// Sentry must be initialized before anything else
const Sentry = require('@sentry/node');
const env = require('./config/env');
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.2 });
}

const app = require('./app');
const { connect: connectDB } = require('./config/database');
const redis = require('./config/redis');
const aidapayMonitor = require('./services/aidapayMonitor.service');
const ajoScheduler = require('./services/ajoScheduler.service');

const AIDAPAY_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const AJO_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour — due dates are date-granularity, not time-sensitive

const start = async () => {
  await connectDB();
  await redis.connect().catch(() => {});

  app.listen(env.PORT, () => {
    console.log(`Paycen API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Single-instance in-process scheduler — fine at this app's current scale
  // (one Render web service, no horizontal scaling), would need moving to a
  // dedicated worker/cron if that changes, to avoid every instance alerting.
  aidapayMonitor.checkBalance().catch((err) => console.error('[aidapay-monitor] startup check failed:', err.message));
  setInterval(() => {
    aidapayMonitor.checkBalance().catch((err) => console.error('[aidapay-monitor] check failed:', err.message));
  }, AIDAPAY_CHECK_INTERVAL_MS);

  ajoScheduler.tick().catch((err) => console.error('[ajo-scheduler] startup tick failed:', err.message));
  setInterval(() => {
    ajoScheduler.tick().catch((err) => console.error('[ajo-scheduler] tick failed:', err.message));
  }, AJO_CHECK_INTERVAL_MS);
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
