const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
require('./models'); // registers every Mongoose model before any route runs
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const notFound = require('./middlewares/notFound.middleware');
const logger = require('./config/logger');

const app = express();

// Behind a reverse proxy (nginx, Render, Heroku, etc.) in production so
// req.ip / rate limiting reflect the real client IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http ? logger.http(msg.trim()) : logger.info(msg.trim()) },
  })
);

// Basic brute-force / abuse protection on the whole API surface. Auth
// endpoints could get a tighter, dedicated limiter in a real deployment.
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(env.apiPrefix, apiLimiter);

app.use(env.apiPrefix, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
