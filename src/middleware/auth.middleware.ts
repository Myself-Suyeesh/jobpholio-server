import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/jwt.utils.js';
import { UnauthorizedError } from '../shared/errors/app.error.js';

/**
 * Authentication Middleware.
 * Extracts Bearer Access Token from Authorization header, verifies signature & expiration,
 * and attaches authenticated user claims to `req.user`.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token missing or malformed'));
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
