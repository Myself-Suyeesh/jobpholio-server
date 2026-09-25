import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid connection URL'),
  MONGODB_TEST_URI: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.string().default('30').transform((val) => parseInt(val, 10)),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid Environment Variables Configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }

  return result.data;
};

export const env = parseEnv();

/**
 * Returns the effective MongoDB connection URI based on the current NODE_ENV.
 * Prevents automated tests from accidentally corrupting development/production databases.
 */
export const getEffectiveMongoUri = (): string => {
  if (env.NODE_ENV === 'test') {
    if (env.MONGODB_TEST_URI) {
      return env.MONGODB_TEST_URI;
    }
    // Append -test to database path if standard URI is used in test mode
    return env.MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, '/$1-test$2');
  }
  return env.MONGODB_URI;
};
