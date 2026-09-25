import { Types } from 'mongoose';
import { ApplicationModel } from '../applications/application.model.js';

export interface CalendarEvent {
  id: string;
  applicationId: string;
  company: string;
  position: string;
  round: string;
  type: string;
  scheduledAt: Date;
  endAt?: Date;
  timezone?: string;
  interviewer?: string;
  meetingUrl?: string;
  status: string;
  notes?: string;
}

export class CalendarService {
  /**
   * Retrieves normalized calendar interview events for a user within an optional date range.
   */
  static async getCalendarEvents(
    userId: string,
    start?: string,
    end?: string
  ): Promise<CalendarEvent[]> {
    const userObjectId = new Types.ObjectId(userId);

    const matchQuery: Record<string, any> = { userId: userObjectId };

    const applications = await ApplicationModel.find(matchQuery)
      .select('company job interviews')
      .lean();

    const events: CalendarEvent[] = [];

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    for (const app of applications) {
      if (!app.interviews || app.interviews.length === 0) continue;

      for (const interview of app.interviews) {
        const scheduledAt = new Date(interview.scheduledAt);

        if (startDate && scheduledAt < startDate) continue;
        if (endDate && scheduledAt > endDate) continue;

        events.push({
          id: (interview as any)._id.toString(),
          applicationId: app._id.toString(),
          company: app.company.name,
          position: app.job.title,
          round: interview.round,
          type: interview.type,
          scheduledAt: interview.scheduledAt,
          endAt: interview.endAt,
          timezone: interview.timezone,
          interviewer: interview.interviewer,
          meetingUrl: interview.meetingUrl,
          status: interview.status,
          notes: interview.notes,
        });
      }
    }

    // Sort events by scheduledAt ascending
    events.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return events;
  }
}
