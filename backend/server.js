const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { connectDB } = require('./src/config/db');
const { initSocket } = require('./src/sockets');

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    logger.info(`EMR Appointment API listening on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.stack || err.message}`);
    process.exit(1);
  });
}

start();
