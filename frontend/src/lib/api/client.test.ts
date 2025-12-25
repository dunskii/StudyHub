import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiClient, ApiError } from './client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('GET requests', () => {
    it('makes a GET request to the correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await api.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('appends query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await api.get('/test', { params: { foo: 'bar', page: '1' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/test\?.*foo=bar/),
        expect.any(Object)
      );
    });

    it('returns parsed JSON response', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await api.get('/test');

      expect(result).toEqual(responseData);
    });
  });

  describe('POST requests', () => {
    it('makes a POST request with JSON body', async () => {
      const requestData = { name: 'Test', value: 123 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await api.post('/create', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('handles POST with no body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await api.post('/action');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/action'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('makes a PUT request with JSON body', async () => {
      const updateData = { id: 1, name: 'Updated' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updateData,
      });

      await api.put('/update/1', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/update/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('PATCH requests', () => {
    it('makes a PATCH request with JSON body', async () => {
      const patchData = { name: 'Updated' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => patchData,
      });

      await api.patch('/update/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/update/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('makes a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
      });

      await api.delete('/items/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('throws ApiError with error_code on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error_code: 'NOT_FOUND', message: 'Resource not found' }),
      });

      try {
        await api.get('/not-found', { retries: 0 });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).errorCode).toBe('NOT_FOUND');
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('uses user-friendly message for known error codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error_code: 'NOT_AUTHENTICATED' }),
      });

      try {
        await api.get('/protected', { retries: 0 });
      } catch (error) {
        expect((error as ApiError).message).toBe('Please log in to continue.');
      }
    });

    it('throws generic error when response has unknown error_code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error_code: 'SOMETHING_NEW' }),
      });

      try {
        await api.get('/error', { retries: 0 });
      } catch (error) {
        expect((error as ApiError).message).toBe('An unexpected error occurred');
      }
    });

    it('throws ApiError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(api.get('/network-fail', { retries: 0 })).rejects.toThrow(ApiError);
    });

    it('handles JSON parse error in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Parse error');
        },
      });

      try {
        await api.get('/parse-error', { retries: 0 });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).errorCode).toBe('UNKNOWN_ERROR');
      }
    });

    it('identifies auth errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error_code: 'TOKEN_EXPIRED' }),
      });

      try {
        await api.get('/protected', { retries: 0 });
      } catch (error) {
        expect((error as ApiError).isAuthError).toBe(true);
      }
    });

    it('identifies rate limit errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error_code: 'RATE_LIMIT_EXCEEDED' }),
      });

      try {
        await api.get('/api', { retries: 0 });
      } catch (error) {
        expect((error as ApiError).isRateLimited).toBe(true);
      }
    });
  });

  describe('Authentication', () => {
    it('adds Authorization header when token provider is set', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:8000',
        tokenProvider: () => 'test-token-123',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await client.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('skips auth header when skipAuth is true', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:8000',
        tokenProvider: () => 'test-token-123',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await client.get('/public', { skipAuth: true });

      const callHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Record<string, string>;
      expect(callHeaders?.Authorization).toBeUndefined();
    });

    it('calls onAuthError callback on auth error', async () => {
      const onAuthError = vi.fn();
      const client = new ApiClient({
        baseUrl: 'http://localhost:8000',
        onAuthError,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error_code: 'TOKEN_EXPIRED' }),
      });

      try {
        await client.get('/protected', { retries: 0 });
      } catch {
        // Expected
      }

      expect(onAuthError).toHaveBeenCalled();
    });
  });

  describe('Retry logic', () => {
    it('does not retry on 4xx errors (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error_code: 'NOT_FOUND' }),
      });

      await expect(api.get('/not-found', { retries: 0 })).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('identifies retryable status codes correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error_code: 'SERVICE_UNAVAILABLE' }),
      });

      try {
        await api.get('/server-error', { retries: 0 });
      } catch (error) {
        expect((error as ApiError).isRetryable).toBe(true);
      }
    });

    it('identifies non-retryable status codes correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error_code: 'NOT_FOUND' }),
      });

      try {
        await api.get('/not-found', { retries: 0 });
      } catch (error) {
        expect((error as ApiError).isRetryable).toBe(false);
      }
    });
  });

  describe('204 No Content', () => {
    it('handles 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await api.delete('/items/1');

      expect(result).toBeUndefined();
    });
  });

  describe('Custom headers', () => {
    it('allows custom headers in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await api.get('/api', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});
