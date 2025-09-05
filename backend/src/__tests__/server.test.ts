import request from 'supertest';
import app from '../index';

describe('Express Server Setup', () => {
  describe('Health Check Endpoint', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        environment: expect.any(String),
        uptime: expect.any(Number),
        timestamp: expect.any(String),
        version: expect.any(String),
      });
    });

    it('should include request ID in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });
  });

  describe('API Info Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Resume Review Tool API',
        version: expect.any(String),
        environment: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 404,
          message: 'Route not found',
          path: '/non-existent-route',
          method: 'GET',
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});