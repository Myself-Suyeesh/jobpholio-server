import { Router } from 'express';
import { CalendarController } from './calendar.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { getCalendarEventsQuerySchema } from './calendar.schema.js';

const calendarRouter = Router();

calendarRouter.use(requireAuth);

calendarRouter.get(
  '/events',
  validateRequest(getCalendarEventsQuerySchema),
  CalendarController.getEvents
);

export default calendarRouter;
