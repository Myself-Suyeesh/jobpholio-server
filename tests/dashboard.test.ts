import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { ApplicationModel } from '../src/modules/applications/application.model.js';
import { generateAccessToken } from '../src/modules/auth/jwt.utils.ts';

let mongoServer: MongoMemoryServer;
const app = createApp();

const createToken = (user: any) =>
  generateAccessToken({
    userId: user._id.toString(),
    email: user.identity.email,
    name: user.identity.name,
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  await ApplicationModel.deleteMany({});
});

describe('Dashboard Read-Model Integration Tests (Phase 9)', () => {
  it('GET /api/v1/dashboard requires authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/dashboard returns exact expected JSON structure', async () => {
    const user = await UserModel.create({
      identity: { name: 'Empty User', email: 'empty@example.com' },
      applicationTracking: { onHoldThresholdDays: 14 },
    });
    const token = createToken(user);

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify EXACT top-level keys in data object
    const dataKeys = Object.keys(res.body.data).sort();
    expect(dataKeys).toEqual([
      'metrics',
      'needsAttentionApplications',
      'recentApplications',
      'upcomingInterviews',
    ]);

    // Verify EXACT keys in metrics object
    const metricsKeys = Object.keys(res.body.data.metrics).sort();
    expect(metricsKeys).toEqual([
      'activeApplications',
      'interviewsScheduled',
      'needsAttentionCount',
      'onHold',
      'totalApplications',
    ]);

    expect(res.body.data.metrics).toEqual({
      totalApplications: 0,
      activeApplications: 0,
      interviewsScheduled: 0,
      onHold: 0,
      needsAttentionCount: 0,
    });
    expect(res.body.data.recentApplications).toEqual([]);
    expect(res.body.data.needsAttentionApplications).toEqual([]);
    expect(res.body.data.upcomingInterviews).toEqual([]);
  });

  it('GET /api/v1/dashboard only returns current user data and enforces strict authorization', async () => {
    const userA = await UserModel.create({
      identity: { name: 'User A', email: 'userA@example.com' },
    });
    const userB = await UserModel.create({
      identity: { name: 'User B', email: 'userB@example.com' },
    });

    const tokenA = createToken(userA);
    const tokenB = createToken(userB);

    await ApplicationModel.create({
      userId: userA._id,
      company: { name: 'Company A' },
      job: { title: 'Role A' },
      status: 'applied',
    });

    const resB = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.metrics.totalApplications).toBe(0);

    const resA = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.metrics.totalApplications).toBe(1);
    expect(resA.body.data.recentApplications[0].company.name).toBe('Company A');
  });

  it('GET /api/v1/dashboard calculates correct application metrics & counts', async () => {
    const user = await UserModel.create({
      identity: { name: 'Multi App User', email: 'multiapp@example.com' },
    });
    const token = createToken(user);

    await ApplicationModel.create([
      { userId: user._id, company: { name: 'Company 1' }, job: { title: 'Dev 1' }, status: 'applied' },
      { userId: user._id, company: { name: 'Company 2' }, job: { title: 'Dev 2' }, status: 'applied' },
      { userId: user._id, company: { name: 'Company 3' }, job: { title: 'Dev 3' }, status: 'interview' },
      { userId: user._id, company: { name: 'Company 4' }, job: { title: 'Dev 4' }, status: 'offer' },
      { userId: user._id, company: { name: 'Company 5' }, job: { title: 'Dev 5' }, status: 'rejected' },
    ]);

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { metrics } = res.body.data;

    expect(metrics.totalApplications).toBe(5);
    expect(metrics.activeApplications).toBe(3); // applied (2) + interview (1)
    expect(metrics.onHold).toBe(0);
  });

  it('GET /api/v1/dashboard derives needs attention applications based on configured threshold', async () => {
    const user = await UserModel.create({
      identity: { name: 'Threshold User', email: 'threshold@example.com' },
      applicationTracking: { onHoldThresholdDays: 14 },
    });
    const token = createToken(user);

    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const appOldOnHold = await ApplicationModel.create({
      userId: user._id,
      company: { name: 'Stale Company' },
      job: { title: 'Engineer' },
      status: 'on_hold',
      lastStatusChangedAt: fifteenDaysAgo,
    });

    await ApplicationModel.create({
      userId: user._id,
      company: { name: 'Fresh Company' },
      job: { title: 'Engineer' },
      status: 'on_hold',
      lastStatusChangedAt: fiveDaysAgo,
    });

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { needsAttentionApplications, metrics } = res.body.data;
    expect(needsAttentionApplications).toHaveLength(1);
    expect(needsAttentionApplications[0]._id).toBe(appOldOnHold._id.toString());
    expect(needsAttentionApplications[0].daysOnHold).toBeGreaterThanOrEqual(14);
    expect(metrics.needsAttentionCount).toBe(1);
    expect(metrics.onHold).toBe(2);
  });

  it('GET /api/v1/dashboard respects user custom onHoldThresholdDays preference', async () => {
    const user = await UserModel.create({
      identity: { name: 'Custom Threshold User', email: 'customthreshold@example.com' },
      applicationTracking: { onHoldThresholdDays: 7 },
    });
    const token = createToken(user);

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    await ApplicationModel.create({
      userId: user._id,
      company: { name: 'Custom Company' },
      job: { title: 'Developer' },
      status: 'on_hold',
      lastStatusChangedAt: tenDaysAgo,
    });

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.needsAttentionApplications).toHaveLength(1);
    expect(res.body.data.needsAttentionApplications[0].daysOnHold).toBeGreaterThanOrEqual(10);
    expect(res.body.data.metrics.needsAttentionCount).toBe(1);
  });

  it('GET /api/v1/dashboard includes upcoming interviews', async () => {
    const user = await UserModel.create({
      identity: { name: 'Full Feature User', email: 'fullfeature@example.com' },
    });
    const token = createToken(user);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await ApplicationModel.create({
      userId: user._id,
      company: { name: 'Meta' },
      job: { title: 'Frontend Engineer' },
      status: 'interview',
      interviews: [
        {
          round: 'System Design',
          type: 'system_design',
          scheduledAt: tomorrow,
          status: 'scheduled',
        },
        {
          round: 'Screening',
          type: 'screening',
          scheduledAt: yesterday,
          status: 'completed',
        },
      ],
    });

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { upcomingInterviews, metrics } = res.body.data;

    expect(upcomingInterviews).toHaveLength(1);
    expect(upcomingInterviews[0].round).toBe('System Design');
    expect(metrics.interviewsScheduled).toBe(1);
  });
});
