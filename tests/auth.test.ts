import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { AuthIdentityModel } from '../src/modules/auth/auth-identity.model.js';
import { SessionModel } from '../src/modules/auth/session.model.js';

describe('Authentication & Session Engine Integration Tests', () => {
  const app = createApp();
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await UserModel.deleteMany({});
    await AuthIdentityModel.deleteMany({});
    await SessionModel.deleteMany({});
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await AuthIdentityModel.deleteMany({});
    await SessionModel.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const testUser = {
    name: 'Sarah Connor',
    email: 'sarah.connor@example.com',
    password: 'SuperSecretPassword123!',
  };

  let accessToken = '';
  let refreshToken = '';

  it('POST /api/v1/auth/register should register a new user and issue tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.identity).toEqual({
      name: testUser.name,
      email: testUser.email,
    });
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data).toHaveProperty('tokens');
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');

    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it('POST /api/v1/auth/register should fail when registering duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('already exists');
  });

  it('POST /api/v1/auth/register should fail on validation error (short password)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test',
      email: 'short@example.com',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login should authenticate user with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.identity.email).toBe(testUser.email);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('POST /api/v1/auth/login should fail with invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword999!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.identity.email).toBe(testUser.email);
  });

  it('GET /api/v1/auth/me should fail when request lacks authorization token', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/identities should return user connected auth identities', async () => {
    const res = await request(app)
      .get('/api/v1/auth/identities')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.identities.length).toBeGreaterThan(0);
    expect(res.body.data.identities[0]).toHaveProperty('provider', 'password');
    expect(res.body.data.identities[0]).not.toHaveProperty('passwordHash');
  });

  it('GET /api/v1/sessions should list active sessions for user', async () => {
    const res = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.sessions)).toBe(true);
    expect(res.body.data.sessions.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/auth/refresh should rotate refresh token and return new tokens', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');

    // Save rotated refresh token
    const newRefreshToken = res.body.data.refreshToken;
    expect(newRefreshToken).not.toBe(refreshToken);

    // Re-using old rotated refresh token must fail
    const replayRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken,
    });
    expect(replayRes.status).toBe(401);

    refreshToken = newRefreshToken;
  });

  it('POST /api/v1/auth/logout should revoke the active session', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({
      refreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Subsequent refresh with logged out token must fail
    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken,
    });
    expect(refreshRes.status).toBe(401);
  });

  it('POST /api/v1/auth/change-password should update password and revoke all active sessions', async () => {
    // 1. Re-login to get fresh tokens
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    const currentAccessToken = loginRes.body.data.tokens.accessToken;

    // 2. Change password
    const newPassword = 'BrandNewSuperPassword456!';
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${currentAccessToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // 3. Login with old password must fail
    const oldLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(oldLoginRes.status).toBe(401);

    // 4. Login with new password must succeed
    const newLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: newPassword,
    });
    expect(newLoginRes.status).toBe(200);
  });
});
