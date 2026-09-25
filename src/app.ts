import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  // Security HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Dynamic CORS configuration supporting credentials and trailing slash normalization
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        const allowedOrigins =
          env.CORS_ORIGIN === '*'
            ? ['*']
            : env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''));

        const normalizedOrigin = origin.replace(/\/$/, '');

        if (
          env.CORS_ORIGIN === '*' ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(normalizedOrigin) ||
          (env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin))
        ) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Set-Cookie'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Rate Limiting
  app.use(globalRateLimiter);
  // 🚀 Debug logger – prints every incoming request
  app.use((req, _res, next) => {
    console.log(`[🔎] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Register Routes
  app.use(routes);

  // Fallback 404 Handler for Unmatched Routes
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
