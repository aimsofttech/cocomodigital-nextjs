const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB, and keep trying.
 *
 * This used to `process.exit(1)` on the first failed connection, which turned
 * any blip on the database host into a dead API: nodemon printed "app crashed -
 * waiting for file changes", every request from the CRM then failed with
 * ECONNREFUSED, and the only way back was to edit a file by hand. A database
 * that is unreachable for thirty seconds should cost thirty seconds, not the
 * whole process.
 *
 * Mongoose already buffers and re-dispatches operations once a connection comes
 * back, and it reconnects on its own after an initial success — so the only gap
 * worth handling here is the *first* connection.
 */

const RETRY_MS = [2000, 5000, 10000, 20000, 30000];

let attempt = 0;
let connecting = false;

const connectDB = async () => {
  if (connecting) return;
  connecting = true;

  // Fail fast rather than sitting on the 30s default: we want to log a clear
  // cause and schedule a retry, not block startup.
  const opts = { serverSelectionTimeoutMS: 8000 };

  const tryConnect = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, opts);
      attempt = 0;
      connecting = false;
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
      const wait = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
      attempt += 1;
      logger.error(
        `MongoDB connection failed (attempt ${attempt}): ${err.message}. `
        + `Retrying in ${wait / 1000}s. The API is up but anything touching the database will fail until it connects.`
      );
      setTimeout(tryConnect, wait).unref?.();
    }
  };

  await tryConnect();
};

// After the first successful connect, the driver handles reconnection itself —
// these just make an outage visible instead of silent.
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected — retrying in the background.'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected.'));
mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));

module.exports = connectDB;
