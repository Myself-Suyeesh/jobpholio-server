import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Foundation & Health Endpoints', () => {
  const app = createApp();

  it('GET /health should return service status payload', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(503); // DB not connected in unit test context
    expect(response.body).toHaveProperty('service', 'JobPholio Backend API');
    expect(response.body).toHaveProperty('status', 'degraded');
    expect(response.body).toHaveProperty('database');
    expect(response.body.database).toHaveProperty('connected', false);
  });

  it('GET /api/v1/ping should return pong', async () => {
    const response = await request(app).get('/api/v1/ping');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { message: 'pong' },
    });
  });

  it('GET /unmatched-route should return 404 error payload', async () => {
    const response = await request(app).get('/unmatched-route');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    });
  });
});
