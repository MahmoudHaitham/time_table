import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';

/**
 * API Client for testing
 */
export class APIClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseURL: string = config.apiBaseUrl) {
    this.client = axios.create({
      baseURL,
      timeout: config.apiTimeout,
      validateStatus: () => true, // Don't throw on any status
      withCredentials: true, // Include cookies
    });

    // Intercept responses to extract CSRF token
    this.client.interceptors.response.use(
      (response) => {
        const csrfToken = response.headers['x-csrf-token'];
        if (csrfToken) {
          this.csrfToken = csrfToken;
        }
        return response;
      },
      (error) => error
    );
  }

  /**
   * Set access token
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Get CSRF token
   */
  getCSRFToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Get access token (for test purposes)
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Make authenticated request
   */
  private getHeaders(includeCSRF: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (includeCSRF && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return headers;
  }

  /**
   * Login
   */
  async login(registrationNumber: string, password: string) {
    const response = await this.client.post('/auth/login', {
      registration_number: registrationNumber,
      password,
    });

    if (response.status === 200 && response.data.data?.token) {
      this.accessToken = response.data.data.token;
      // CSRF token extracted from response headers via interceptor
    }

    return response;
  }

  /**
   * Logout
   */
  async logout() {
    const response = await this.client.post(
      '/auth/logout',
      {},
      { headers: this.getHeaders(true) }
    );
    this.accessToken = null;
    this.csrfToken = null;
    return response;
  }

  /**
   * Refresh token
   */
  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    if (response.status === 200 && response.data.data?.token) {
      this.accessToken = response.data.data.token;
    }
    return response;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    return this.client.get('/auth/me', {
      headers: this.getHeaders(),
    });
  }

  /**
   * GET request
   */
  async get(endpoint: string, includeCSRF: boolean = false) {
    return this.client.get(endpoint, {
      headers: this.getHeaders(includeCSRF),
    });
  }

  /**
   * POST request
   */
  async post(endpoint: string, data: any, includeCSRF: boolean = true) {
    return this.client.post(endpoint, data, {
      headers: this.getHeaders(includeCSRF),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint: string, data: any, includeCSRF: boolean = true) {
    return this.client.put(endpoint, data, {
      headers: this.getHeaders(includeCSRF),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint: string, includeCSRF: boolean = true) {
    return this.client.delete(endpoint, {
      headers: this.getHeaders(includeCSRF),
    });
  }

  /**
   * Make request without authentication
   */
  async unauthenticatedRequest(method: string, endpoint: string, data?: any) {
    return this.client.request({
      method,
      url: endpoint,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    this.accessToken = null;
    this.csrfToken = null;
  }
}
