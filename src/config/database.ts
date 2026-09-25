import mongoose from 'mongoose';
import { getEffectiveMongoUri } from './env.js';
import { logger } from './logger.js';

/**
 * Sanitizes MongoDB connection URIs to prevent credential leakage in logs.
 * Example: mongodb+srv://user:pass@cluster.mongodb.net -> mongodb+srv://***:***@cluster.mongodb.net
 */
export const sanitizeMongoUri = (uri: string): string => {
  try {
    return uri.replace(/\/\/(.*?)@/, '//***:***@');
  } catch {
    return 'mongodb://***:***@hidden';
  }
};

export interface IDatabaseHealth {
  connected: boolean;
  readyState: number;
  readyStateText: string;
  host?: string;
  name?: string;
}

const readyStateMap: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Returns structured health state of the Mongoose database connection.
 * Omits internal credentials or full connection strings.
 */
export const getDatabaseHealth = (): IDatabaseHealth => {
  const readyState = mongoose.connection.readyState;
  const connected = readyState === 1;

  return {
    connected,
    readyState,
    readyStateText: readyStateMap[readyState] || 'unknown',
    ...(connected && mongoose.connection.host ? { host: mongoose.connection.host } : {}),
    ...(connected && mongoose.connection.name ? { name: mongoose.connection.name } : {}),
  };
};

export const connectDB = async (): Promise<boolean> => {
  const uri = getEffectiveMongoUri();
  const sanitizedUri = sanitizeMongoUri(uri);

  try {
    mongoose.connection.on('connecting', () => {
      logger.info('Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      logger.info({ host: mongoose.connection.host, name: mongoose.connection.name }, 'MongoDB successfully connected ✅');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err: err.message }, 'MongoDB connection warning ⚠️');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    logger.info({ target: sanitizedUri }, 'Initiating MongoDB connection');

    await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV === 'development',
      serverSelectionTimeoutMS: 5000,
    });

    return true;
  } catch (error: any) {
    logger.warn(
      { message: error?.message || error, target: sanitizedUri },
      'MongoDB connection failed. Service operating in degraded state ⚠️'
    );
    return false;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed cleanly');
  }
};
