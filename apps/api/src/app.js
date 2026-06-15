const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { notFound, globalError } = require('./middlewares/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const airtimeRoutes = require('./modules/vtu/airtime/airtime.routes');
const dataRoutes = require('./modules/vtu/data/data.routes');
const cableRoutes = require('./modules/vtu/cable/cable.routes');
const electricityRoutes = require('./modules/vtu/electricity/electricity.routes');
const examRoutes = require('./modules/vtu/exam/exam.routes');
const servicesRoutes = require('./modules/services/services.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');

const app = express();

app.set('trust proxy', 1);

// CORS — supports comma-separated origins in CLIENT_URL e.g. "https://app.com,https://www.app.com"
const allowedOrigins = (env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))   // strip trailing slash
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Root + health — both respond so platform health checks always pass
app.get('/',       (req, res) => res.json({ service: 'PayPoint API', status: 'ok', version: '1.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/airtime', airtimeRoutes);
app.use('/api/v1/data', dataRoutes);
app.use('/api/v1/cable', cableRoutes);
app.use('/api/v1/electricity', electricityRoutes);
app.use('/api/v1/exam', examRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use(notFound);
app.use(globalError);

module.exports = app;
