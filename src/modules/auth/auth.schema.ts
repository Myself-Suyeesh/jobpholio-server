import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters long").trim(),
    email: z
      .string()
      .email("Must be a valid email address")
      .trim()
      .toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Must be a valid email address")
      .trim()
      .toLowerCase(),
    password: z.string().min(1, "Password is required"),
  }),
});

// export const refreshTokenSchema = z.object({
// body: z.object({
//   refreshToken: z.string().min(1, 'Refresh token is required'),
// }),
// });

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
// export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
