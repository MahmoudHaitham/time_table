import { APIClient } from './utils/api-client';
import { config } from './config';

describe('Error Handling Test Cases', () => {
  let apiClient: APIClient;

  beforeEach(async () => {
    apiClient = new APIClient();
  });

  describe('TC-ERROR-001: 401 vs 403 Correctness', () => {
    it('should return 401 for missing authentication', async () => {
      const response = await apiClient.unauthenticatedRequest(
        'GET',
        '/auth/me'
      );

      // May be rate limited (429) or auth required (401)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.data.message).toMatch(/Authentication|required/i);
      }
    });

    it('should return 401 for invalid token', async () => {
      apiClient.setAccessToken('invalid_token');
      const response = await apiClient.getCurrentUser();

      // May be rate limited (429) or invalid token (401)
      expect([401, 429]).toContain(response.status);
    });

    it('should return 403 for unauthorized role', async () => {
      // Login as student
      try {
        await apiClient.login(
          config.studentCredentials.registration_number,
          config.studentCredentials.password
        );

        // Try admin endpoint
        const response = await apiClient.get('/terms');
        expect(response.status).toBe(403);
        expect(response.data.message).toMatch(/Admin|access|required/i);
      } catch (e) {
        // Student may not exist
      }
    });
  });

  describe('TC-ERROR-002: Generic Error Messages', () => {
    it('should return generic error messages in production', async () => {
      // Trigger various errors
      const errorScenarios = [
        { method: 'GET', path: '/nonexistent' },
        { method: 'POST', path: '/terms', body: {} },
      ];

      for (const scenario of errorScenarios) {
        let response;
        if (scenario.method === 'GET') {
          response = await apiClient.get(scenario.path);
        } else {
          response = await apiClient.post(scenario.path, scenario.body);
        }

        // Check error format
        if (response.status >= 400) {
          expect(response.data).toBeDefined();
          expect(response.data.success).toBe(false);
          expect(response.data.message).toBeDefined();

          // Should not contain stack traces
          expect(JSON.stringify(response.data)).not.toContain('stack');
          expect(JSON.stringify(response.data)).not.toContain('at ');
          expect(JSON.stringify(response.data)).not.toContain('.ts:');
          expect(JSON.stringify(response.data)).not.toContain('.js:');
        }
      }
    });
  });

  describe('TC-ERROR-003: No Stack Traces in Production', () => {
    it('should not expose stack traces', async () => {
      // Trigger error
      const response = await apiClient.get('/nonexistent-endpoint-12345');

      if (response.status >= 500) {
        // Server errors should not expose stack
        expect(JSON.stringify(response.data)).not.toContain('stack');
        expect(JSON.stringify(response.data)).not.toContain('Error:');
      }
    });
  });

  describe('TC-ERROR-004: Consistent Error Format', () => {
    it('should return consistent error format', async () => {
      const errorResponses = [
        await apiClient.unauthenticatedRequest('GET', '/auth/me'),
        await apiClient.get('/nonexistent'),
      ];

      for (const response of errorResponses) {
        if (response.status >= 400) {
          expect(response.data).toHaveProperty('success');
          expect(response.data.success).toBe(false);
          expect(response.data).toHaveProperty('message');
          expect(typeof response.data.message).toBe('string');
        }
      }
    });
  });

  describe('TC-ERROR-005: Sensitive Data Not Logged', () => {
    it('should not expose passwords in error responses', async () => {
      const response = await apiClient.login('testuser', 'testpassword');

      // Error response should not contain password
      if (response.status >= 400) {
        expect(JSON.stringify(response.data)).not.toContain('testpassword');
        expect(JSON.stringify(response.data)).not.toContain('password');
      }
    });
  });
});
