const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB Atlas (or any Mongo URI).
 * Fails fast on boot if the connection cannot be established - we don't want
 * the HTTP server to start accepting traffic against a dead database.
 */
async function connectDB() {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(env.mongoUri, {
      // Modern mongoose (8.x) no longer needs useNewUrlParser/useUnifiedTopology,
      // kept here as explicit documentation of intent for reviewers.
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
