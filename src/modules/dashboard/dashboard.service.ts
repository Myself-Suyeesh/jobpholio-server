import { Types } from 'mongoose';
import { ApplicationModel, ApplicationStatus } from '../applications/application.model.js';
import { UserModel } from '../users/user.model.js';

export interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  interviewsScheduled: number;
  onHold: number;
  needsAttentionCount: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentApplications: any[];
  needsAttentionApplications: any[];
  upcomingInterviews: any[];
}

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

    // Step 3: Recent applications (top 5 sorted by dateApplied desc)
    const recentApplications = await ApplicationModel.find({ userId: userObjectId })
      .sort({ dateApplied: -1 })
      .limit(5)
      .lean();

    // Step 4: Needs attention applications (status === 'on_hold' & lastStatusChangedAt <= thresholdDate)
    const needsAttentionDocs = await ApplicationModel.find({
      userId: userObjectId,
      status: 'on_hold',
      lastStatusChangedAt: { $lte: thresholdDate },
    })
      .sort({ lastStatusChangedAt: 1 })
      .lean();

    const needsAttentionApplications = needsAttentionDocs.map((app) => {
      const daysOnHold = Math.floor(
        (now.getTime() - new Date(app.lastStatusChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        ...app,
        daysOnHold,
      };
    });

    // Step 5: Upcoming interviews (scheduledAt >= now and not cancelled)
    const upcomingInterviewApps = await ApplicationModel.find({
      userId: userObjectId,
      'interviews.scheduledAt': { $gte: now },
    })
      .select('company job interviews')
      .lean();

    const upcomingInterviews: any[] = [];
    for (const app of upcomingInterviewApps) {
      if (!app.interviews) continue;
      for (const interview of app.interviews) {
        if (new Date(interview.scheduledAt) >= now && interview.status !== 'cancelled') {
          upcomingInterviews.push({
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
    upcomingInterviews.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

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
      recentApplications,
      needsAttentionApplications,
      upcomingInterviews,
    };
  }
}
