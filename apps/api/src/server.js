require('dotenv').config();
const app = require('./app');
const { connect: connectDB } = require('./config/database');
const redis = require('./config/redis');
const env = require('./config/env');

const start = async () => {
  await connectDB();
  await redis.connect().catch(() => {});

  app.listen(env.PORT, () => {
    console.log(`PayPoint API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
