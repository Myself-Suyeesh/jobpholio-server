import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { logger } from './config/logger.js';

const startServer = async () => {
  try {
    // 1. Instantiate Express App
    const app = createApp();

    // 2. Start HTTP Listener immediately
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 JobPholio Backend Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // 3. Connect to Database asynchronously
    connectDB().catch((err) => {
      logger.warn({ err }, 'Background MongoDB connection attempt encountered an issue');
    });

    // 4. Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDB();
        logger.info('Graceful shutdown completed.');
        process.exit(0);
      });

      // Force shutdown after 10s if connections persist
      setTimeout(() => {
        logger.error('Forced shutdown after timeout ❌');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start JobPholio server ❌');
    process.exit(1);
  }
};

startServer();
