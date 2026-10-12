import { Request, Response, NextFunction } from "express";
import { ProfileService } from "./profile.service.js";
import {
  DeleteAvatarFromCloudinary,
  UploadAvatarToCloudinary,
} from "../cloudinary/cloudinary.service.js";
import { UpdateProfileInput } from "./profile.schema.js";

export class ProfileController {
  public static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
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

  public static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    let uploadedAvatar:
      | Awaited<ReturnType<typeof UploadAvatarToCloudinary>>
      | undefined;

    try {
      const input = req.body as UpdateProfileInput;

      if (req.file) {
        uploadedAvatar = await UploadAvatarToCloudinary(req.file.buffer);

        input.identity = {
          ...input.identity,
          avatarUrl: uploadedAvatar.secureUrl,
        };
      }

      const user = await ProfileService.updateProfile(req.user!.id, input);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      if (uploadedAvatar) {
        try {
          await DeleteAvatarFromCloudinary(uploadedAvatar.publicId);
        } catch {
          // Preserve the original error if cleanup also fails.
        }
      }

      next(error);
    }
  }

  public static async getCompletion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
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
