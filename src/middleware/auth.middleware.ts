import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/auth/jwt.utils.js";
import { UnauthorizedError } from "../shared/errors/app.error.js";

/**
 * Authentication Middleware.
 * verifies signature & expiration, and attaches authenticated user claims to `req.user`.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return next(
      new UnauthorizedError("Authentication token missing or malformed"),
    );
  }

  try {
    const payload = verifyAccessToken(accessToken);
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
