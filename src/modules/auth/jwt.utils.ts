import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../shared/errors/app.error.js';

export interface JwtAccessPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Generates a short-lived JWT access token (default 15 mins).
 */
export const generateAccessToken = (payload: JwtAccessPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

/**
 * Verifies JWT access token and returns payload. Throws UnauthorizedError if invalid or expired.
 */
export const verifyAccessToken = (token: string): JwtAccessPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtAccessPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
};
