import { ApplicationModel, IApplication, ApplicationStatus, ApplicationSource } from './application.model.js';
import {
  CreateApplicationInput,
  UpdateApplicationInput,
  QueryApplicationsInput,
  AddNoteInput,
  AddFileInput,
  AddInterviewInput,
  UpdateInterviewInput,
} from './application.schema.js';
import { NotFoundError } from '../../shared/errors/app.error.js';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApplicationService {
  /**
   * Create a new job application and automatically generate the initial timeline event.
   */
  public static async createApplication(userId: string, input: CreateApplicationInput): Promise<IApplication> {
    const status: ApplicationStatus = input.status || 'applied';
    const now = new Date();

    const application = new ApplicationModel({
      userId,
      company: input.company,
      job: input.job,
      source: input.source || 'manual',
      status,
      dateApplied: input.dateApplied ? new Date(input.dateApplied) : now,
      lastStatusChangedAt: now,
      nextStep: input.nextStep
        ? {
            type: input.nextStep.type,
            title: input.nextStep.title,
            dueAt: input.nextStep.dueAt ? new Date(input.nextStep.dueAt) : undefined,
          }
        : undefined,
      timeline: [
        {
          type: 'application_created',
          status,
          title: `Application submitted for ${input.job.title} at ${input.company.name}`,
          occurredAt: now,
          createdAt: now,
        },
      ],
    });

    await application.save();
    return application;
  }

  /**
   * Fetch a list of applications for an authenticated user with search, filtering, sorting & pagination.
   */
  public static async listApplications(
    userId: string,
    query: QueryApplicationsInput
  ): Promise<PaginatedResult<IApplication>> {
    const filter: Record<string, any> = { userId };

    // Status Filter
    if (query.status) {
      filter.status = query.status;
    }

    // Source Filter
    if (query.source) {
      filter.source = query.source;
    }

    // Location Filter
    if (query.location) {
      filter['job.location'] = { $regex: query.location, $options: 'i' };
    }

    // Date Range Filter
    if (query.dateFrom || query.dateTo) {
      filter.dateApplied = {};
      if (query.dateFrom) {
        filter.dateApplied.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        filter.dateApplied.$lte = new Date(query.dateTo);
      }
    }

    // Search query (Company name or Job title)
    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [{ 'company.name': searchRegex }, { 'job.title': searchRegex }];
    }

    // Pagination
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // Sorting
    const sortFieldMap: Record<string, string> = {
      dateApplied: 'dateApplied',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      lastStatusChangedAt: 'lastStatusChangedAt',
      companyName: 'company.name',
    };
    const sortField = sortFieldMap[query.sortBy || 'dateApplied'] || 'dateApplied';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortOption: Record<string, any> = { [sortField]: sortOrder };

    const [applications, total] = await Promise.all([
      ApplicationModel.find(filter).sort(sortOption).skip(skip).limit(limit),
      ApplicationModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get an application by ID strictly scoped to the authenticated user.
   */
  public static async getApplicationById(userId: string, applicationId: string): Promise<IApplication> {
    const application = await ApplicationModel.findOne({ _id: applicationId, userId });
    if (!application) {
      throw new NotFoundError('Application not found');
    }
    return application;
  }

  /**
   * Update general fields of an application.
   */
  public static async updateApplication(
    userId: string,
    applicationId: string,
    input: UpdateApplicationInput
  ): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const now = new Date();

    // If status is changed, track status transition and append timeline event
    if (input.status && input.status !== application.status) {
      const oldStatus = application.status;
      application.status = input.status;
      application.lastStatusChangedAt = now;
      application.timeline.push({
        type: 'status_changed',
        status: input.status,
        title: `Status changed from ${oldStatus} to ${input.status}`,
        occurredAt: now,
        createdAt: now,
      } as any);
    }

    if (input.company) {
      Object.assign(application.company, input.company);
    }
    if (input.job) {
      Object.assign(application.job, input.job);
    }
    if (input.source) {
      application.source = input.source;
    }
    if (input.dateApplied) {
      application.dateApplied = new Date(input.dateApplied);
    }
    if (input.nextStep) {
      application.nextStep = {
        type: input.nextStep.type,
        title: input.nextStep.title,
        dueAt: input.nextStep.dueAt ? new Date(input.nextStep.dueAt) : undefined,
        completedAt: input.nextStep.completedAt ? new Date(input.nextStep.completedAt) : undefined,
      };
    }

    await application.save();
    return application;
  }

  /**
   * Dedicated domain operation for changing status, updating lastStatusChangedAt, and appending a timeline event.
   */
  public static async updateStatus(
    userId: string,
    applicationId: string,
    status: ApplicationStatus,
    note?: string
  ): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const now = new Date();

    if (application.status === status) {
      return application; // No change required
    }

    const oldStatus = application.status;
    application.status = status;
    application.lastStatusChangedAt = now;

    application.timeline.push({
      type: 'status_changed',
      status,
      title: `Status changed from ${oldStatus} to ${status}`,
      note,
      occurredAt: now,
      createdAt: now,
    } as any);

    await application.save();
    return application;
  }

  /**
   * Delete an application.
   */
  public static async deleteApplication(userId: string, applicationId: string): Promise<void> {
    const result = await ApplicationModel.findOneAndDelete({ _id: applicationId, userId });
    if (!result) {
      throw new NotFoundError('Application not found');
    }
  }

  /**
   * Get application timeline.
   */
  public static async getTimeline(userId: string, applicationId: string) {
    const application = await this.getApplicationById(userId, applicationId);
    return application.timeline.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  // --- Subdocument Operations: Notes ---

  public static async addNote(userId: string, applicationId: string, input: AddNoteInput): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const now = new Date();

    application.notes.push({
      content: input.content,
      createdAt: now,
      updatedAt: now,
    } as any);

    application.timeline.push({
      type: 'note_added',
      status: application.status,
      title: 'Note added',
      note: input.content.length > 100 ? `${input.content.substring(0, 100)}...` : input.content,
      occurredAt: now,
      createdAt: now,
    } as any);

    await application.save();
    return application;
  }

  public static async updateNote(
    userId: string,
    applicationId: string,
    noteId: string,
    input: AddNoteInput
  ): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const note = application.notes.find((n) => n._id.toString() === noteId);

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    note.content = input.content;
    note.updatedAt = new Date();

    await application.save();
    return application;
  }

  public static async deleteNote(userId: string, applicationId: string, noteId: string): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const note = application.notes.find((n) => n._id.toString() === noteId);

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    (note as any).deleteOne();
    await application.save();
    return application;
  }

  // --- Subdocument Operations: Files ---

  public static async addFile(userId: string, applicationId: string, input: AddFileInput): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const now = new Date();

    application.files.push({
      name: input.name,
      url: input.url,
      mimeType: input.mimeType,
      size: input.size,
      category: input.category || 'other',
      uploadedAt: now,
    } as any);

    application.timeline.push({
      type: 'file_uploaded',
      status: application.status,
      title: `File uploaded: ${input.name}`,
      occurredAt: now,
      createdAt: now,
    } as any);

    await application.save();
    return application;
  }

  public static async deleteFile(userId: string, applicationId: string, fileId: string): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const file = application.files.find((f) => f._id.toString() === fileId);

    if (!file) {
      throw new NotFoundError('File not found');
    }

    (file as any).deleteOne();
    await application.save();
    return application;
  }

  // --- Subdocument Operations: Interviews ---

  public static async addInterview(
    userId: string,
    applicationId: string,
    input: AddInterviewInput
  ): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const now = new Date();
    const scheduledDate = new Date(input.scheduledAt);

    application.interviews.push({
      scheduledAt: scheduledDate,
      endAt: input.endAt ? new Date(input.endAt) : undefined,
      timezone: input.timezone || 'UTC',
      round: input.round,
      type: input.type || 'technical',
      interviewer: input.interviewer,
      meetingUrl: input.meetingUrl,
      notes: input.notes,
      status: input.status || 'scheduled',
      createdAt: now,
      updatedAt: now,
    } as any);

    // Update nextStep if scheduled in future
    application.nextStep = {
      type: 'interview',
      title: `${input.round} Interview`,
      dueAt: scheduledDate,
    };

    // Auto-update status to 'interview' if currently 'applied'
    if (application.status === 'applied') {
      application.status = 'interview';
      application.lastStatusChangedAt = now;
    }

    application.timeline.push({
      type: 'interview_scheduled',
      status: application.status,
      title: `${input.round} interview scheduled`,
      note: input.notes,
      occurredAt: now,
      createdAt: now,
    } as any);

    await application.save();
    return application;
  }

  public static async updateInterview(
    userId: string,
    applicationId: string,
    interviewId: string,
    input: UpdateInterviewInput
  ): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const interview = application.interviews.find((i) => i._id.toString() === interviewId);

    if (!interview) {
      throw new NotFoundError('Interview round not found');
    }

    if (input.scheduledAt) interview.scheduledAt = new Date(input.scheduledAt);
    if (input.endAt) interview.endAt = new Date(input.endAt);
    if (input.timezone) interview.timezone = input.timezone;
    if (input.round) interview.round = input.round;
    if (input.type) interview.type = input.type;
    if (input.interviewer !== undefined) interview.interviewer = input.interviewer;
    if (input.meetingUrl !== undefined) interview.meetingUrl = input.meetingUrl;
    if (input.notes !== undefined) interview.notes = input.notes;
    if (input.status) interview.status = input.status;
    interview.updatedAt = new Date();

    await application.save();
    return application;
  }

  public static async deleteInterview(
    userId: string,
    applicationId: string,
    interviewId: string
  ): Promise<IApplication> {
    const application = await this.getApplicationById(userId, applicationId);
    const interview = application.interviews.find((i) => i._id.toString() === interviewId);

    if (!interview) {
      throw new NotFoundError('Interview round not found');
    }

    (interview as any).deleteOne();
    await application.save();
    return application;
  }
}
