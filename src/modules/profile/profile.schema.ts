import { z } from 'zod';

const workTypeEnum = z.enum(['remote', 'hybrid', 'onsite']);

export const updateProfileSchema = z.object({
  body: z.object({
    identity: z
      .object({
        name: z.string().min(2, 'Name must be at least 2 characters long').trim().optional(),
        email: z.string().email('Must be a valid email address').trim().toLowerCase().optional(),
        avatarUrl: z.string().url().optional().or(z.literal('')),
      })
      .optional(),
    profile: z
      .object({
        phone: z.string().trim().optional(),
        location: z.string().trim().optional(),
        timezone: z.string().trim().min(1).optional(),
        bio: z.string().trim().optional(),
      })
      .optional(),
    professional: z
      .object({
        headline: z.string().trim().optional(),
        yearsOfExperience: z.number().min(0).optional(),
        skills: z.array(z.string().trim().min(1)).optional(),
        summary: z.string().trim().optional(),
      })
      .optional(),
    jobPreferences: z
      .object({
        roles: z.array(z.string().trim().min(1)).optional(),
        locations: z.array(z.string().trim().min(1)).optional(),
        workTypes: z.array(workTypeEnum).optional(),
        industries: z.array(z.string().trim().min(1)).optional(),
        weeklyApplicationGoal: z.number().int().min(1).optional(),
      })
      .optional(),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
