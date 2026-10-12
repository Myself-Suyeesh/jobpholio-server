import { Request, Response, NextFunction, Router } from "express";
import { ProfileController } from "./profile.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import { updateProfileSchema } from "./profile.schema.js";
import avatarUpload from "../../middleware/avatar.middleware.js";

const profileRouter = Router();

const parseProfileMultipart = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const fields = [
    "identity",
    "profile",
    "professional",
    "jobPreferences",
  ] as const;

  try {
    for (const field of fields) {
      const value = req.body?.[field];

      if (typeof value === "string") {
        req.body[field] = JSON.parse(value);
      }
    }

    next();
  } catch {
    const error = new Error(
      "Invalid profile data. Profile fields must contain valid JSON.",
    );

    Object.assign(error, { status: 400 });
    next(error);
  }
};
profileRouter.use(requireAuth);

profileRouter.get("/completion", ProfileController.getCompletion);
profileRouter.get("/", ProfileController.getProfile);
profileRouter.patch(
  "/",
  avatarUpload.single("avatar"),
  parseProfileMultipart,
  validateRequest(updateProfileSchema),
  ProfileController.updateProfile,
);

export default profileRouter;
