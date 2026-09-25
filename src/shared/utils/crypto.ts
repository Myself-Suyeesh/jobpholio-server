import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes plain-text password using bcrypt with salt factor 12.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compares plain-text password against bcrypt hash.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Hashes a token string (e.g. refresh token) using SHA-256 for secure database storage.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generates a cryptographically secure random token string.
 */
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
