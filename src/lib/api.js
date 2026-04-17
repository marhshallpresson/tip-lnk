/**
 * TipLnk API Client
 * Handles CSRF tokens, Bearer tokens, and base URL
 */

const isProd = import.meta.env.PROD;
// In production, we MUST use the current origin. 
// Falling back to localhost in prod causes the ERR_CONNECTION_REFUSED
const API_BASE_URL = (isProd 
  ? window.location.origin 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005')) + '/api';

class ApiClient {
  constructor() {
    this.csrfToken = null;
    this.accessToken = localStorage.getItem('tiplnk_access_token');
  }

  setAccessToken(token) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('tiplnk_access_token', token);
    } else {
      localStorage.removeItem('tiplnk_access_token');
    }
  }

  async getCsrfToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf`);
      const data = await response.json();
      if (data.success) {
        this.csrfToken = data.csrfToken;
        return data.csrfToken;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
    return null;
  }

  async request(endpoint, options = {}) {
    let { method = 'GET', body, headers = {}, ...rest } = options;

    if (!this.csrfToken && method !== 'GET') {
      await this.getCsrfToken();
    }

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    if (this.csrfToken) {
      defaultHeaders['X-CSRF-Token'] = this.csrfToken;
    }

    if (this.accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const finalHeaders = { ...defaultHeaders, ...headers };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        ...rest,
      });

      if (response.status === 401) {
        // Potential session expiry
        console.warn('Unauthorized request, clearing token.');
        // this.setAccessToken(null);
      }

      const data = await response.json();
      return { data, status: response.status, ok: response.ok };
    } catch (error) {
      console.error(`API Request Error [${endpoint}]:`, error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
