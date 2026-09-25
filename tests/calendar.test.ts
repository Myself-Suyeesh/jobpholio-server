import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { AuthIdentityModel } from '../src/modules/auth/auth-identity.model.js';
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
  await AuthIdentityModel.deleteMany({});
  await ApplicationModel.deleteMany({});
});

describe('Calendar Domain Integration Tests', () => {
  it('GET /api/v1/calendar/events should fail without authorization token', async () => {
    const res = await request(app).get('/api/v1/calendar/events');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/calendar/events should return empty array when user has no interviews', async () => {
    const user = await UserModel.create({
      identity: { name: 'User Calendar', email: 'calendar@example.com' },
    });
    const token = createToken(user);

    const res = await request(app)
      .get('/api/v1/calendar/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('GET /api/v1/calendar/events should return normalized interview events', async () => {
    const user = await UserModel.create({
      identity: { name: 'User Calendar', email: 'calendar@example.com' },
    });
    const token = createToken(user);

    const futureDate = new Date(Date.now() + 86400000); // 1 day in future

    const application = await ApplicationModel.create({
      userId: user._id,
      company: { name: 'Google' },
      job: { title: 'Software Engineer' },
      status: 'interview',
      interviews: [
        {
          round: 'Technical Round 1',
          type: 'technical',
          scheduledAt: futureDate,
          timezone: 'UTC',
          interviewer: 'Sundar',
          meetingUrl: 'https://meet.google.com/abc',
          status: 'scheduled',
          notes: 'Prepare system design',
        },
      ],
    });

    const res = await request(app)
      .get('/api/v1/calendar/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const event = res.body.data[0];
    expect(event.applicationId).toBe(application._id.toString());
    expect(event.company).toBe('Google');
    expect(event.position).toBe('Software Engineer');
    expect(event.round).toBe('Technical Round 1');
    expect(event.type).toBe('technical');
    expect(event.meetingUrl).toBe('https://meet.google.com/abc');
  });

  it('GET /api/v1/calendar/events should isolate events between users', async () => {
    const userA = await UserModel.create({
      identity: { name: 'User A', email: 'usera@example.com' },
    });
    const userB = await UserModel.create({
      identity: { name: 'User B', email: 'userb@example.com' },
    });

    const tokenA = createToken(userA);
    const tokenB = createToken(userB);

    await ApplicationModel.create({
      userId: userA._id,
      company: { name: 'Company A' },
      job: { title: 'Role A' },
      interviews: [
        {
          round: 'Round A',
          type: 'technical',
          scheduledAt: new Date(),
          status: 'scheduled',
        },
      ],
    });

    const resB = await request(app)
      .get('/api/v1/calendar/events')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data).toHaveLength(0);

    const resA = await request(app)
      .get('/api/v1/calendar/events')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data).toHaveLength(1);
  });
});
