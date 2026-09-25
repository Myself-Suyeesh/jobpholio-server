import { Schema, model, Document, Types } from 'mongoose';
import { baseSchemaOptions } from '../../shared/database/base.schema.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  identity: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  profile: {
    phone?: string;
    location?: string;
    timezone: string;
    bio?: string;
  };
  professional: {
    headline?: string;
    yearsOfExperience?: number;
    skills: string[];
    summary?: string;
  };
  jobPreferences: {
    roles: string[];
    locations: string[];
    workTypes: ('remote' | 'hybrid' | 'onsite')[];
    industries: string[];
    weeklyApplicationGoal: number;
  };
  notificationPreferences: {
    applicationCaptured: boolean;
    statusUpdates: boolean;
    interviewReminders: boolean;
    followUpReminders: boolean;
    weeklySummary: boolean;
    productUpdates: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    reduceMotion: boolean;
  };
  applicationTracking: {
    onHoldThresholdDays: number;
  };
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    identity: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      avatarUrl: { type: String, trim: true },
    },
    profile: {
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
      timezone: { type: String, default: 'UTC', trim: true },
      bio: { type: String, trim: true },
    },
    professional: {
      headline: { type: String, trim: true },
      yearsOfExperience: { type: Number, min: 0 },
      skills: [{ type: String, trim: true }],
      summary: { type: String, trim: true },
    },
    jobPreferences: {
      roles: [{ type: String, trim: true }],
      locations: [{ type: String, trim: true }],
      workTypes: [{ type: String, enum: ['remote', 'hybrid', 'onsite'] }],
      industries: [{ type: String, trim: true }],
      weeklyApplicationGoal: { type: Number, default: 5, min: 1 },
    },
    notificationPreferences: {
      applicationCaptured: { type: Boolean, default: true },
      statusUpdates: { type: Boolean, default: true },
      interviewReminders: { type: Boolean, default: true },
      followUpReminders: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: true },
      productUpdates: { type: Boolean, default: false },
    },
    appearance: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      compactMode: { type: Boolean, default: false },
      reduceMotion: { type: Boolean, default: false },
    },
    applicationTracking: {
      onHoldThresholdDays: { type: Number, default: 14, min: 1 },
    },
    lastLoginAt: { type: Date },
    emailVerifiedAt: { type: Date },
    deletedAt: { type: Date },
  },
  baseSchemaOptions
);

export const UserModel = model<IUser>('User', UserSchema);
