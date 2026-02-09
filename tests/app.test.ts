// Ensure mock mode for tests
process.env.AUTHLETE_BEARER = 'mock';
process.env.AUTHLETE_SERVICE_ID = 'test-service';

import request from 'supertest';
import { app } from '../src/app';

describe('Basic integration tests', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('POST /token (client_credentials) returns mock access token', async () => {
    const res = await request(app)
      .post('/token')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('grant_type=client_credentials&client_id=any&client_secret=any');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token', 'mock-access-token');
    expect(res.body).toHaveProperty('token_type', 'Bearer');
  });
});
