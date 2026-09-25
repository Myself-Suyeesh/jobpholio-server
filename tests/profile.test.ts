import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { AuthIdentityModel } from '../src/modules/auth/auth-identity.model.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('User Profile & Preferences Integration Tests', () => {
  const app = createApp();
  let mongoServer: MongoMemoryServer;
  let accessToken = '';
  let otherUserToken = '';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await UserModel.deleteMany({});
    await AuthIdentityModel.deleteMany({});

    const primary = await AuthService.register({
      name: 'Alex Johnson',
      email: 'alex@example.com',
      password: 'SecurePassword123!',
    });
    accessToken = primary.tokens.accessToken;

    const other = await AuthService.register({
      name: 'Other User',
      email: 'other@example.com',
      password: 'SecurePassword123!',
    });
    otherUserToken = other.tokens.accessToken;
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await AuthIdentityModel.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('GET /api/v1/profile should fail without an authorization token', async () => {
    const res = await request(app).get('/api/v1/profile');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/profile should return the authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.identity).toMatchObject({
      name: 'Alex Johnson',
      email: 'alex@example.com',
    });
    expect(res.body.data.user.profile.timezone).toBe('UTC');
    expect(res.body.data.user.jobPreferences.weeklyApplicationGoal).toBe(5);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('GET /api/v1/profile/completion should return a low percentage for a new account', async () => {
    const res = await request(app)
      .get('/api/v1/profile/completion')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.percentage).toBe(0);
    expect(res.body.data.breakdown).toEqual({
      personalInfo: false,
      professionalDetails: false,
      jobPreferences: false,
      hasDefaultDocument: false,
    });
  });

  it('PATCH /api/v1/profile should reject invalid nested payloads', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { email: 'not-an-email' },
        professional: { yearsOfExperience: -1 },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/v1/profile should apply partial nested updates without wiping defaults', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { name: 'Alex J.' },
        profile: { phone: '+1-555-0100', location: 'Austin, TX' },
        professional: {
          headline: 'Backend Engineer',
          yearsOfExperience: 6,
          skills: ['Node.js', 'MongoDB'],
        },
        jobPreferences: {
          roles: ['Backend Engineer'],
          locations: ['Austin'],
          workTypes: ['remote'],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.identity.name).toBe('Alex J.');
    expect(res.body.data.user.identity.email).toBe('alex@example.com');
    expect(res.body.data.user.profile.phone).toBe('+1-555-0100');
    expect(res.body.data.user.profile.location).toBe('Austin, TX');
    expect(res.body.data.user.profile.timezone).toBe('UTC');
    expect(res.body.data.user.professional.headline).toBe('Backend Engineer');
    expect(res.body.data.user.professional.skills).toEqual(['Node.js', 'MongoDB']);
    expect(res.body.data.user.jobPreferences.roles).toEqual(['Backend Engineer']);
    expect(res.body.data.user.jobPreferences.weeklyApplicationGoal).toBe(5);
  });

  it('GET /api/v1/profile/completion should recalculate after a complete profile update', async () => {
    const res = await request(app)
      .get('/api/v1/profile/completion')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.breakdown).toEqual({
      personalInfo: true,
      professionalDetails: true,
      jobPreferences: true,
      hasDefaultDocument: false,
    });
    expect(res.body.data.percentage).toBe(75);
  });

  it('PATCH /api/v1/profile should reject a duplicate email', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { email: 'other@example.com' },
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('PATCH /api/v1/profile should keep login working after a unique email change', async () => {
    const updateRes = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { email: 'alex.johnson@example.com' },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.user.identity.email).toBe('alex.johnson@example.com');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.johnson@example.com',
      password: 'SecurePassword123!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.identity.email).toBe('alex.johnson@example.com');
  });

  it('GET /api/v1/profile should not leak another user\'s profile', async () => {
    const res = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.identity.email).toBe('other@example.com');
    expect(res.body.data.user.identity.name).toBe('Other User');
  });
});
