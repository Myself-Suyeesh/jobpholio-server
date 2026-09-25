import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { AuthIdentityModel } from '../src/modules/auth/auth-identity.model.js';
import { ApplicationModel } from '../src/modules/applications/application.model.ts';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('Applications Domain Integration Tests', () => {
  const app = createApp();
  let mongoServer: MongoMemoryServer;

  let tokenUserA = '';
  let tokenUserB = '';
  let userAId = '';
  let userBId = '';
  let applicationAId = '';
  let noteId = '';
  let fileId = '';
  let interviewId = '';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await UserModel.deleteMany({});
    await AuthIdentityModel.deleteMany({});
    await ApplicationModel.deleteMany({});

    // Register User A
    const resA = await AuthService.register({
      name: 'User Alpha',
      email: 'user.alpha@example.com',
      password: 'Password123!',
    });
    tokenUserA = resA.tokens.accessToken;
    userAId = resA.user._id.toString();

    // Register User B
    const resB = await AuthService.register({
      name: 'User Beta',
      email: 'user.beta@example.com',
      password: 'Password123!',
    });
    tokenUserB = resB.tokens.accessToken;
    userBId = resB.user._id.toString();
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
    await AuthIdentityModel.deleteMany({});
    await ApplicationModel.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('POST /api/v1/applications should create an application and append initial timeline event', async () => {
    const payload = {
      company: {
        name: 'Google',
        website: 'https://google.com',
      },
      job: {
        title: 'Senior Software Engineer',
        location: 'Mountain View, CA',
        employmentType: 'full_time',
        salary: { min: 180000, max: 240000, currency: 'USD' },
      },
      source: 'linkedin',
      status: 'applied',
    };

    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application).toHaveProperty('id');
    expect(res.body.data.application.company.name).toBe('Google');
    expect(res.body.data.application.job.title).toBe('Senior Software Engineer');
    expect(res.body.data.application.status).toBe('applied');
    expect(res.body.data.application.timeline.length).toBe(1);
    expect(res.body.data.application.timeline[0].type).toBe('application_created');

    applicationAId = res.body.data.application.id;
  });

  it('GET /api/v1/applications should list user applications with search & pagination', async () => {
    const res = await request(app)
      .get('/api/v1/applications?search=Google&page=1&limit=10')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('GET /api/v1/applications/:id should return single application', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.id).toBe(applicationAId);
  });

  it('PATCH /api/v1/applications/:id/status should update status, lastStatusChangedAt, and append timeline event', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationAId}/status`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        status: 'interview',
        note: 'Scheduled recruiter call.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('interview');
    expect(res.body.data.application.lastStatusChangedAt).toBeDefined();

    // Verify timeline has 2 events (created + status_changed)
    expect(res.body.data.application.timeline.length).toBe(2);
    expect(res.body.data.application.timeline[1].type).toBe('status_changed');
    expect(res.body.data.application.timeline[1].status).toBe('interview');
  });

  it('POST /api/v1/applications/:id/notes should add a note subdocument', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationAId}/notes`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ content: 'Review system design architecture before interview.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.notes.length).toBe(1);
    expect(res.body.data.application.notes[0].content).toBe('Review system design architecture before interview.');

    noteId = res.body.data.application.notes[0].id;
  });

  it('PATCH /api/v1/applications/:id/notes/:noteId should update note subdocument', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationAId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ content: 'Updated note content for system design prep.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.notes[0].content).toBe('Updated note content for system design prep.');
  });

  it('POST /api/v1/applications/:id/files should add a file metadata subdocument', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationAId}/files`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Google_Tailored_Resume.pdf',
        url: 'https://storage.provider.com/files/resume.pdf',
        mimeType: 'application/pdf',
        size: 154000,
        category: 'resume',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.files.length).toBe(1);
    expect(res.body.data.application.files[0].name).toBe('Google_Tailored_Resume.pdf');

    fileId = res.body.data.application.files[0].id;
  });

  it('POST /api/v1/applications/:id/interviews should add an interview round subdocument', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationAId}/interviews`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        scheduledAt: '2026-10-01T14:00:00.000Z',
        round: 'Technical Screening',
        type: 'technical',
        interviewer: 'Tech Lead John',
        meetingUrl: 'https://meet.google.com/xyz-abc-def',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.interviews.length).toBe(1);
    expect(res.body.data.application.interviews[0].round).toBe('Technical Screening');

    interviewId = res.body.data.application.interviews[0].id;
  });

  it('GET /api/v1/applications/:id/timeline should return sorted timeline history', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationAId}/timeline`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(4);
  });

  // --- CROSS-USER AUTHORIZATION TESTS ---

  it('User B CANNOT access User A application (404 Not Found)', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${applicationAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('User B CANNOT update User A application status (404 Not Found)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationAId}/status`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('User B CANNOT delete User A application (404 Not Found)', async () => {
    const res = await request(app)
      .delete(`/api/v1/applications/${applicationAId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/v1/applications/:id should allow owner User A to delete application', async () => {
    const res = await request(app)
      .delete(`/api/v1/applications/${applicationAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify application no longer exists
    const checkRes = await request(app)
      .get(`/api/v1/applications/${applicationAId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(checkRes.status).toBe(404);
  });
});
