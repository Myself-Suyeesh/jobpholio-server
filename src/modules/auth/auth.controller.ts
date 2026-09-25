import { Request, Response, NextFunction } from 'express';
import { AuthService, RequestMeta } from './auth.service.js';
import { UserModel } from '../users/user.model.js';
import { NotFoundError } from '../../shared/errors/app.error.js';

const extractMeta = (req: Request): RequestMeta => ({
  userAgent: req.headers['user-agent'],
  ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip || req.socket.remoteAddress,
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = extractMeta(req);
      const result = await AuthService.register(req.body, meta);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = extractMeta(req);
      const result = await AuthService.login(req.body, meta);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = extractMeta(req);
      const tokens = await AuthService.refresh(req.body.refreshToken, meta);

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logout(req.body?.refreshToken);

      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserModel.findById(req.user!.id);
      if (!user) {
        throw new NotFoundError('User profile not found');
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.changePassword(req.user!.id, req.body);

      res.status(200).json({
        success: true,
        data: { message: 'Password changed successfully. All active sessions have been revoked.' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getIdentities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identities = await AuthService.getUserIdentities(req.user!.id);

      res.status(200).json({
        success: true,
        data: { identities },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await AuthService.getUserSessions(req.user!.id);

      res.status(200).json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await AuthService.revokeSession(req.user!.id, sessionId);

      res.status(200).json({
        success: true,
        data: { message: 'Session revoked successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async revokeAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.revokeAllSessions(req.user!.id);

      res.status(200).json({
        success: true,
        data: { message: 'All active sessions revoked successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}
