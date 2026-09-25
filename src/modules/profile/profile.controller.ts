import { Request, Response, NextFunction } from 'express';
import { ProfileService } from './profile.service.js';

export class ProfileController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await ProfileService.getProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await ProfileService.updateProfile(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const completion = await ProfileService.getCompletion(req.user!.id);
      res.status(200).json({
        success: true,
        data: completion,
      });
    } catch (error) {
      next(error);
    }
  }
}
