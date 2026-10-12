import { Readable } from "stream";
import cloudinary from "../../config/cloudinary.js";

interface UploadAvatarResult {
  secureUrl: string;
  publicId: string;
}

export const UploadAvatarToCloudinary = async (
  buffer: Buffer,
): Promise<UploadAvatarResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "jobpholio/avatars",
        resource_type: "image",
        allowed_formats: ["png", "jpg", "webp", "jpeg"],
        transformation: [
          {
            width: 512,
            height: 512,
            crop: "limit",
          },
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary did not return an upload result."));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    Readable.from(buffer).pipe(stream);
  });
};

export const DeleteAvatarFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
};
