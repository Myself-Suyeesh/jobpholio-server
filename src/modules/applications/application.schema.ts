import { z } from 'zod';

const applicationStatusEnum = z.enum(['applied', 'on_hold', 'interview', 'offer', 'rejected']);
const applicationSourceEnum = z.enum(['linkedin', 'naukri', 'indeed', 'company_site', 'manual', 'other']);
const employmentTypeEnum = z.enum(['full_time', 'part_time', 'contract', 'internship']);
const interviewTypeEnum = z.enum(['screening', 'technical', 'behavioral', 'system_design', 'hr', 'other']);
const interviewStatusEnum = z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']);
const fileCategoryEnum = z.enum(['resume', 'cover_letter', 'job_description', 'interview_notes', 'offer_letter', 'other']);

const optionalUrlSchema = z.string().trim().optional().or(z.literal(''));
const optionalDateSchema = z.string().trim().optional().or(z.literal(''));

export const createApplicationSchema = z.object({
  body: z.object({
    company: z.object({
      name: z.string().min(1, 'Company name is required').trim(),
      logoUrl: optionalUrlSchema,
      website: optionalUrlSchema,
      description: z.string().optional(),
    }),
    job: z.object({
      title: z.string().min(1, 'Job title is required').trim(),
      jobId: z.string().optional(),
      location: z.string().optional(),
      employmentType: employmentTypeEnum.optional(),
      jobUrl: optionalUrlSchema,
      salary: z
        .object({
          min: z.number().min(0).optional(),
          max: z.number().min(0).optional(),
          currency: z.string().default('USD').optional(),
        })
        .optional(),
    }),
    source: applicationSourceEnum.default('manual'),
    status: applicationStatusEnum.default('applied'),
    dateApplied: optionalDateSchema,
    nextStep: z
      .object({
        type: z.string().optional(),
        title: z.string().optional(),
        dueAt: optionalDateSchema,
      })
      .optional(),
  }),
});

export const updateApplicationSchema = z.object({
  body: z.object({
    company: z
      .object({
        name: z.string().min(1).trim().optional(),
        logoUrl: z.string().url().optional().or(z.literal('')),
        website: z.string().url().optional().or(z.literal('')),
        description: z.string().optional(),
      })
      .optional(),
    job: z
      .object({
        title: z.string().min(1).trim().optional(),
        jobId: z.string().optional(),
        location: z.string().optional(),
        employmentType: employmentTypeEnum.optional(),
        jobUrl: z.string().url().optional().or(z.literal('')),
        salary: z
          .object({
            min: z.number().min(0).optional(),
            max: z.number().min(0).optional(),
            currency: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    source: applicationSourceEnum.optional(),
    status: applicationStatusEnum.optional(),
    dateApplied: z.string().datetime().or(z.string().date()).optional(),
    nextStep: z
      .object({
        type: z.string().optional(),
        title: z.string().optional(),
        dueAt: z.string().datetime().optional(),
        completedAt: z.string().datetime().optional(),
      })
      .optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: applicationStatusEnum,
    note: z.string().optional(),
  }),
});

export const queryApplicationsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: applicationStatusEnum.optional(),
    source: applicationSourceEnum.optional(),
    location: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.enum(['dateApplied', 'createdAt', 'updatedAt', 'lastStatusChangedAt', 'companyName']).default('dateApplied'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
});

export const addNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Note content cannot be empty').trim(),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Note content cannot be empty').trim(),
  }),
});

export const addFileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'File name is required').trim(),
    url: z.string().url('File URL must be a valid URL'),
    mimeType: z.string().min(1, 'Mime type is required'),
    size: z.number().min(0, 'File size must be positive'),
    category: fileCategoryEnum.default('other'),
  }),
});

export const addInterviewSchema = z.object({
  body: z.object({
    scheduledAt: z.string().datetime('scheduledAt must be a valid ISO date'),
    endAt: z.string().datetime().optional(),
    timezone: z.string().default('UTC').optional(),
    round: z.string().min(1, 'Round title is required').trim(),
    type: interviewTypeEnum.default('technical'),
    interviewer: z.string().optional(),
    meetingUrl: z.string().url().optional().or(z.literal('')),
    notes: z.string().optional(),
    status: interviewStatusEnum.default('scheduled'),
  }),
});

export const updateInterviewSchema = z.object({
  body: z.object({
    scheduledAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    timezone: z.string().optional(),
    round: z.string().min(1).optional(),
    type: interviewTypeEnum.optional(),
    interviewer: z.string().optional(),
    meetingUrl: z.string().url().optional().or(z.literal('')),
    notes: z.string().optional(),
    status: interviewStatusEnum.optional(),
  }),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>['body'];
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
export type QueryApplicationsInput = z.infer<typeof queryApplicationsSchema>['query'];
export type AddNoteInput = z.infer<typeof addNoteSchema>['body'];
export type AddFileInput = z.infer<typeof addFileSchema>['body'];
export type AddInterviewInput = z.infer<typeof addInterviewSchema>['body'];
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>['body'];
