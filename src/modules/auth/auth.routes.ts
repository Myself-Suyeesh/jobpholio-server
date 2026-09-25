import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } from './auth.schema.js';

const authRouter = Router();

// Public Routes (Rate limited)
authRouter.post('/register', authRateLimiter, validateRequest(registerSchema), AuthController.register);
authRouter.post('/login', authRateLimiter, validateRequest(loginSchema), AuthController.login);
authRouter.post('/refresh', authRateLimiter, validateRequest(refreshTokenSchema), AuthController.refresh);
authRouter.post('/logout', AuthController.logout);

// Authenticated Routes
authRouter.get('/me', requireAuth, AuthController.me);
authRouter.post('/change-password', requireAuth, authRateLimiter, validateRequest(changePasswordSchema), AuthController.changePassword);
authRouter.get('/identities', requireAuth, AuthController.getIdentities);

export default authRouter;
