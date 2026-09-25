import { Schema, model, Document, Types } from 'mongoose';
import { baseSchemaOptions, applyGlobalSchemaPlugins } from '../../shared/database/base.schema.js';

export type ApplicationStatus = 'applied' | 'on_hold' | 'interview' | 'offer' | 'rejected';
export type ApplicationSource = 'linkedin' | 'naukri' | 'indeed' | 'company_site' | 'manual' | 'other';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type InterviewType = 'screening' | 'technical' | 'behavioral' | 'system_design' | 'hr' | 'other';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type FileCategory = 'resume' | 'cover_letter' | 'job_description' | 'interview_notes' | 'offer_letter' | 'other';
export type TimelineEventType =
  | 'application_created'
  | 'status_changed'
  | 'note_added'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'interview_rescheduled'
  | 'offer_received'
  | 'file_uploaded'
  | 'follow_up_added';

export interface IInterview {
  _id: Types.ObjectId;
  scheduledAt: Date;
  endAt?: Date;
  timezone?: string;
  round: string;
  type: InterviewType;
  interviewer?: string;
  meetingUrl?: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimelineEvent {
  _id: Types.ObjectId;
  type: TimelineEventType;
  status?: ApplicationStatus;
  title: string;
  note?: string;
  occurredAt: Date;
  createdAt: Date;
}

export interface INote {
  _id: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileMetadata {
  _id: Types.ObjectId;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  uploadedAt: Date;
}

export interface IApplication extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  company: {
    name: string;
    logoUrl?: string;
    website?: string;
    description?: string;
  };
  job: {
    title: string;
    jobId?: string;
    location?: string;
    employmentType?: EmploymentType;
    jobUrl?: string;
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
  };
  source: ApplicationSource;
  status: ApplicationStatus;
  dateApplied: Date;
  nextStep?: {
    type?: string;
    title?: string;
    dueAt?: Date;
    completedAt?: Date;
  };
  interviews: Types.DocumentArray<IInterview & Document>;
  notes: Types.DocumentArray<INote & Document>;
  files: Types.DocumentArray<IFileMetadata & Document>;
  timeline: Types.DocumentArray<ITimelineEvent & Document>;
  lastStatusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    scheduledAt: { type: Date, required: true },
    endAt: { type: Date },
    timezone: { type: String, default: 'UTC', trim: true },
    round: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['screening', 'technical', 'behavioral', 'system_design', 'hr', 'other'],
      default: 'technical',
    },
    interviewer: { type: String, trim: true },
    meetingUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
  },
  baseSchemaOptions
);

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    type: { type: String, required: true },
    status: { type: String, enum: ['applied', 'on_hold', 'interview', 'offer', 'rejected'] },
    title: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

const NoteSchema = new Schema<INote>(
  {
    content: { type: String, required: true, trim: true },
  },
  baseSchemaOptions
);

const FileMetadataSchema = new Schema<IFileMetadata>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['resume', 'cover_letter', 'job_description', 'interview_notes', 'offer_letter', 'other'],
      default: 'other',
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

const ApplicationSchema = new Schema<IApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: {
      name: { type: String, required: true, trim: true },
      logoUrl: { type: String, trim: true },
      website: { type: String, trim: true },
      description: { type: String, trim: true },
    },
    job: {
      title: { type: String, required: true, trim: true },
      jobId: { type: String, trim: true },
      location: { type: String, trim: true },
      employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'internship'] },
      jobUrl: { type: String, trim: true },
      salary: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 },
        currency: { type: String, default: 'USD', trim: true },
      },
    },
    source: {
      type: String,
      enum: ['linkedin', 'naukri', 'indeed', 'company_site', 'manual', 'other'],
      default: 'manual',
      index: true,
    },
    status: {
      type: String,
      enum: ['applied', 'on_hold', 'interview', 'offer', 'rejected'],
      default: 'applied',
      index: true,
    },
    dateApplied: { type: Date, default: Date.now, index: true },
    nextStep: {
      type: { type: String, trim: true },
      title: { type: String, trim: true },
      dueAt: { type: Date },
      completedAt: { type: Date },
    },
    interviews: [InterviewSchema],
    notes: [NoteSchema],
    files: [FileMetadataSchema],
    timeline: [TimelineEventSchema],
    lastStatusChangedAt: { type: Date, default: Date.now, index: true },
  },
  baseSchemaOptions
);

// Compound Indexes for fast user-scoped query filtering, sorting, calendar & dashboard aggregation
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ userId: 1, dateApplied: -1 });
ApplicationSchema.index({ userId: 1, lastStatusChangedAt: -1 });
ApplicationSchema.index({ userId: 1, status: 1, lastStatusChangedAt: -1 });
ApplicationSchema.index({ userId: 1, 'interviews.scheduledAt': 1 });
ApplicationSchema.index({ userId: 1, source: 1 });
ApplicationSchema.index({ 'company.name': 'text', 'job.title': 'text' });

export const ApplicationModel = model<IApplication>('Application', ApplicationSchema);
