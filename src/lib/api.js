/**
 * Tip Stack API Client
 * Handles CSRF tokens, Bearer tokens, and base URL
 */

const isProd = import.meta.env.MODE === 'production';
const API_BASE_URL = (isProd
  ? window.location.origin
  : (import.meta.env.VITE_API_BASE_URL)) + '/api';
const AUTH_TOKEN_KEY = 'tipstack_auth_token';
const LEGACY_TOKEN_KEY = 'tipstack_access_token';

class ApiClient {
  constructor() {
    this.csrfToken = null;
    this.onUnauthorized = null;
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    this.accessToken = token || null;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  }

  setAccessToken(token) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  }

  setUnauthorizedHandler(handler) {
    this.onUnauthorized = handler;
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

  async request(endpoint, options = {}, isRetry = false) {
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
        if (!isRetry && this.onUnauthorized) {
          console.warn('Unauthorized, attempting silent refresh...');
          const refreshed = await this.onUnauthorized();
          if (refreshed) {
            return this.request(endpoint, options, true);
          }
        }
        console.warn('Unauthorized request, clearing token.');
      }

      const responseText = await response.text();
      let data = null;
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {
            success: false,
            error: response.ok ? 'Invalid JSON response' : (response.statusText || 'Request failed'),
            details: responseText,
          };
        }
      }

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
