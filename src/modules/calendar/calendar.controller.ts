import { Request, Response, NextFunction } from 'express';
import { CalendarService } from './calendar.service.js';

export class CalendarController {
  static async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { start, end } = req.query as { start?: string; end?: string };

      const events = await CalendarService.getCalendarEvents(userId, start, end);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }
}
