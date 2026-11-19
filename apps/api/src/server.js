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

const start = async () => {
  await connectDB();
  await redis.connect().catch(() => {});

  app.listen(env.PORT, () => {
    console.log(`WavyPay API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
