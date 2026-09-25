import { Schema, model, Document, Types } from 'mongoose';
import { baseSchemaOptions } from '../../shared/database/base.schema.js';

export interface IAuthIdentity extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: 'password' | 'google' | 'apple';
  providerAccountId: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuthIdentitySchema = new Schema<IAuthIdentity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['password', 'google', 'apple'], required: true },
    providerAccountId: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, select: false },
  },
  baseSchemaOptions
);

AuthIdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
AuthIdentitySchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const AuthIdentityModel = model<IAuthIdentity>('AuthIdentity', AuthIdentitySchema);
