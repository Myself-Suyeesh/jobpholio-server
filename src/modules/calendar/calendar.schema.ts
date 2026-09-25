import { z } from 'zod';

export const getCalendarEventsQuerySchema = z.object({
  query: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }),
});

export type GetCalendarEventsQueryInput = z.infer<typeof getCalendarEventsQuerySchema>['query'];
