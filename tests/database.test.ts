import { describe, it, expect } from 'vitest';
import mongoose, { Schema, model } from 'mongoose';
import { sanitizeMongoUri, getDatabaseHealth } from '../src/config/database.js';
import { getEffectiveMongoUri } from '../src/config/env.js';
import { baseSchemaOptions, toJSONTransformer, applyGlobalSchemaPlugins } from '../src/shared/database/base.schema.js';

describe('Database Infrastructure & Schema Standards', () => {
  it('sanitizeMongoUri should redact credentials from connection string', () => {
    const rawUri = 'mongodb+srv://suyeesh_user:SecretPassword123@jobpholio.ulw7gqk.mongodb.net/jobpholio-dev';
    const sanitized = sanitizeMongoUri(rawUri);
    expect(sanitized).not.toContain('suyeesh_user');
    expect(sanitized).not.toContain('SecretPassword123');
    expect(sanitized).toContain('mongodb+srv://***:***@jobpholio.ulw7gqk.mongodb.net/jobpholio-dev');
  });

  it('getEffectiveMongoUri should append -test suffix when in test environment', () => {
    const effectiveUri = getEffectiveMongoUri();
    expect(effectiveUri).toContain('-test');
  });

  it('getDatabaseHealth should report clean connection state without secrets', () => {
    const health = getDatabaseHealth();
    expect(health).toHaveProperty('connected');
    expect(health).toHaveProperty('readyState');
    expect(health).toHaveProperty('readyStateText');
    expect(health).not.toHaveProperty('password');
  });

  it('toJSONTransformer should replace _id with string id and strip __v', () => {
    const mockDoc = {};
    const mockRet = {
      _id: new mongoose.Types.ObjectId('650000000000000000000001'),
      name: 'Test Document',
      __v: 0,
    };

    const transformed = toJSONTransformer(mockDoc, mockRet);
    expect(transformed).toHaveProperty('id', '650000000000000000000001');
    expect(transformed).not.toHaveProperty('_id');
    expect(transformed).not.toHaveProperty('__v');
    expect(transformed.name).toBe('Test Document');
  });

  it('applyGlobalSchemaPlugins should apply strict, timestamps, and toJSON serialization options', () => {
    interface TestDoc {
      title: string;
    }

    const TestSchema = new Schema<TestDoc>({
      title: { type: String, required: true },
    });

    applyGlobalSchemaPlugins(TestSchema);

    expect(TestSchema.get('timestamps')).toBe(true);
    expect(TestSchema.get('strict')).toBe(true);
    expect(TestSchema.get('toJSON')).toBeDefined();
    expect(TestSchema.get('toJSON').transform).toBe(toJSONTransformer);
  });
});
