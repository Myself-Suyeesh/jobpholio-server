import { Types } from 'mongoose';
import { ApplicationModel, ApplicationStatus } from '../applications/application.model.js';
import { UserModel } from '../users/user.model.js';
import { normalizeDocument } from '../../shared/utils/normalize.js';

export interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  interviewsScheduled: number;
  onHold: number;
  needsAttentionCount: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentActivity: any[];
  needsAttentionApplications: any[];
  upcomingInterviews: any[];
}

const formatStatusTitle = (status?: string): string => {
  switch (status) {
    case 'applied':
      return 'Applied';
    case 'on_hold':
      return 'On Hold';
    case 'interview':
      return 'Interview';
    case 'offer':
      return 'Offer';
    case 'rejected':
      return 'Rejected';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  }
};

const formatSimpleActivityTitle = (event: { type: string; status?: string; title?: string }): string => {
  switch (event.type) {
    case 'application_created':
      return 'Application submitted';
    case 'status_changed':
      return event.status ? `Status changed to ${formatStatusTitle(event.status)}` : 'Status changed';
    case 'note_added':
      return 'Note added';
    case 'interview_scheduled':
      return 'Interview scheduled';
    case 'interview_completed':
      return 'Interview completed';
    case 'interview_rescheduled':
      return 'Interview rescheduled';
    case 'offer_received':
      return 'Offer received';
    case 'file_uploaded':
      return 'File uploaded';
    case 'follow_up_added':
      return 'Follow-up added';
    default:
      return event.title && event.title.length <= 35 ? event.title : 'Activity updated';
  }
};

export class DashboardService {
  /**
   * Derives real-time dashboard read-model analytics for the authenticated user.
   */
  static async getDashboard(userId: string): Promise<DashboardData> {
    const userObjectId = new Types.ObjectId(userId);

    // Step 1: Fetch user settings for threshold preferences
    const user = await UserModel.findById(userObjectId)
      .select('applicationTracking')
      .lean();

    const onHoldThresholdDays = user?.applicationTracking?.onHoldThresholdDays ?? 14;
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - onHoldThresholdDays * 24 * 60 * 60 * 1000);

    // Step 2: Status counts aggregation
    const statusCountsRaw = await ApplicationModel.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts: Record<ApplicationStatus, number> = {
      applied: 0,
      on_hold: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    let totalApplications = 0;
    for (const item of statusCountsRaw) {
      if (item._id in statusCounts) {
        statusCounts[item._id as ApplicationStatus] = item.count;
      }
      totalApplications += item.count;
    }

    // Step 3: Recent Activity (top 5 applications sorted by updatedAt desc, timeline omitted, simplified latestActivity attached)
    const recentDocs = await ApplicationModel.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    const recentActivity = recentDocs.map((app) => {
      const lastEvent =
        app.timeline && app.timeline.length > 0 ? app.timeline[app.timeline.length - 1] : null;
      const { timeline, ...rest } = app;
      const normalized = normalizeDocument(rest);

      return {
        ...normalized,
        latestActivity: lastEvent
          ? {
              title: formatSimpleActivityTitle(lastEvent),
              type: lastEvent.type,
              occurredAt: lastEvent.occurredAt,
            }
          : undefined,
      };
    });

    // Step 4: Needs attention applications (on_hold > threshold OR completed/past interviews missing notes)
    const onHoldDocs = await ApplicationModel.find({
      userId: userObjectId,
      status: 'on_hold',
      lastStatusChangedAt: { $lte: thresholdDate },
    })
      .sort({ lastStatusChangedAt: 1 })
      .lean();

    const missingNotesDocs = await ApplicationModel.find({
      userId: userObjectId,
      interviews: {
        $elemMatch: {
          $or: [{ scheduledAt: { $lt: now } }, { status: 'completed' }],
          $and: [{ status: { $ne: 'cancelled' } }],
          $or: [{ notes: { $exists: false } }, { notes: '' }, { notes: null }],
        },
      },
    }).lean();

    // Map and deduplicate needs attention applications
    const needsAttentionMap = new Map<string, any>();

    for (const app of onHoldDocs) {
      const daysOnHold = Math.floor(
        (now.getTime() - new Date(app.lastStatusChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const { timeline, ...rest } = app;
      const normalized = normalizeDocument(rest);
      needsAttentionMap.set(normalized.id, {
        ...normalized,
        daysOnHold,
        attentionReason: `On hold for ${daysOnHold} days`,
      });
    }

    for (const app of missingNotesDocs) {
      const { timeline, ...rest } = app;
      const normalized = normalizeDocument(rest);
      if (!needsAttentionMap.has(normalized.id)) {
        needsAttentionMap.set(normalized.id, {
          ...normalized,
          attentionReason: 'Missing interview notes',
        });
      }
    }

    const needsAttentionApplications = Array.from(needsAttentionMap.values());

    // Step 5: Upcoming interviews (scheduledAt >= now and not cancelled)
    const upcomingInterviewApps = await ApplicationModel.find({
      userId: userObjectId,
      'interviews.scheduledAt': { $gte: now },
    })
      .select('company job interviews')
      .lean();

    const upcomingInterviewsRaw: any[] = [];
    for (const app of upcomingInterviewApps) {
      if (!app.interviews) continue;
      for (const interview of app.interviews) {
        if (new Date(interview.scheduledAt) >= now && interview.status !== 'cancelled') {
          upcomingInterviewsRaw.push({
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
    }
    upcomingInterviewsRaw.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    const upcomingInterviews = normalizeDocument(upcomingInterviewsRaw);

    // Step 6: Derive activeApplications and metrics
    const activeApplications =
      statusCounts.applied + statusCounts.on_hold + statusCounts.interview;

    const metrics: DashboardMetrics = {
      totalApplications,
      activeApplications,
      interviewsScheduled: upcomingInterviews.length,
      onHold: statusCounts.on_hold,
      needsAttentionCount: needsAttentionApplications.length,
    };

    return {
      metrics,
      recentActivity,
      needsAttentionApplications,
      upcomingInterviews,
    };
  }
}
