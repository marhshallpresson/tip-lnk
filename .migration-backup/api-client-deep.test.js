// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage globally before any imports
vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

const { api } = await import('./src/lib/api.js');

// Mock fetch globally
global.fetch = vi.fn();

describe('ApiClient Deep Test (Silent Retry)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.setAccessToken('initial-token');
    api.csrfToken = 'mock-csrf';
  });

  it('should retry a request once if it returns 401 and onUnauthorized is successful', async () => {
    const mockHandler = vi.fn().mockResolvedValue(true);
    api.setUnauthorizedHandler(mockHandler);

    // 1st call: 401
    // 2nd call (retry): 200
    global.fetch
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        text: async () => JSON.stringify({ error: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ success: true, data: 'retried-data' }),
      });

    const result = await api.get('/test-endpoint');

    // Verify onUnauthorized was called
    expect(mockHandler).toHaveBeenCalledTimes(1);
    
    // Verify fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Verify result is from the successful retry
    expect(result.data.success).toBe(true);
    expect(result.data.data).toBe('retried-data');
  });

  it('should not retry if onUnauthorized fails (returns false)', async () => {
    const mockHandler = vi.fn().mockResolvedValue(false);
    api.setUnauthorizedHandler(mockHandler);

    global.fetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: 'Unauthorized' }),
    });

    const result = await api.get('/test-endpoint');

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(401);
  });

  it('should not retry if isRetry is already true (prevent infinite loop)', async () => {
    const mockHandler = vi.fn().mockResolvedValue(true);
    api.setUnauthorizedHandler(mockHandler);

    // Both calls return 401
    global.fetch.mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: 'Unauthorized' }),
    });

    const result = await api.get('/test-endpoint');

    // Should only call handler once and fetch twice (one original, one retry)
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(401);
  });
});
