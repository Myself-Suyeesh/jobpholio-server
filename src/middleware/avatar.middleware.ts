import multer from "multer";
import type { Request } from "express";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (
  _req: Request,
  file: Express.Multer.File,
  callback,
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    callback(new Error("Only JPG, PNG, and WebP images are allowed."));
    return;
  }

  callback(null, true);
};

const avatarUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});

export default avatarUpload;
