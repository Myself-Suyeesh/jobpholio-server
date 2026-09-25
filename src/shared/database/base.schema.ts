import { SchemaOptions, Schema } from 'mongoose';

/**
 * Standard Mongoose Schema Serialization Transformer.
 * Replaces `_id` with `id` string representation and strips `__v` version key.
 */
export const toJSONTransformer = (doc: any, ret: Record<string, any>): Record<string, any> => {
  if (ret._id) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
  delete ret.__v;
  return ret;
};

/**
 * Base Schema Options for all JobPholio Mongoose Schemas.
 * Enforces strict typing, auto-timestamps, and standard JSON serialization.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  strict: true,
  toJSON: {
    virtuals: true,
    transform: toJSONTransformer,
  },
  toObject: {
    virtuals: true,
    transform: toJSONTransformer,
  },
};

/**
 * Global Mongoose Plugin applying serialization rules to schemas.
 */
export const applyGlobalSchemaPlugins = (schema: Schema): void => {
  schema.set('timestamps', true);
  schema.set('strict', true);
  schema.set('toJSON', {
    virtuals: true,
    transform: toJSONTransformer,
  });
  schema.set('toObject', {
    virtuals: true,
    transform: toJSONTransformer,
  });
};
