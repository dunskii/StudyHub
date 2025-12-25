/**
 * API client with authentication, error handling, timeouts, and retry logic.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/** Maximum number of retry attempts for failed requests */
const MAX_RETRIES = 3;

/** Delay between retries in milliseconds (with exponential backoff) */
const RETRY_DELAY = 1000;

/** HTTP status codes that should trigger a retry */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Error codes returned by the API.
 * Maps to backend ErrorCode enum.
 */
export type ApiErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CSRF_INVALID'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

/**
 * User-friendly error messages for each error code.
 */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  NOT_AUTHENTICATED: 'Please log in to continue.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'This item already exists.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  CSRF_INVALID: 'Security validation failed. Please refresh the page and try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
};

/**
 * API error response structure from the backend.
 */
interface ApiErrorResponse {
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  public readonly errorCode: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    errorCode: ApiErrorCode,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Check if this error indicates the user needs to re-authenticate.
   */
  get isAuthError(): boolean {
    return ['NOT_AUTHENTICATED', 'TOKEN_EXPIRED', 'INVALID_CREDENTIALS'].includes(
      this.errorCode
    );
  }

  /**
   * Check if this error is due to rate limiting.
   */
  get isRateLimited(): boolean {
    return this.errorCode === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * Check if this error should trigger a retry.
   */
  get isRetryable(): boolean {
    return RETRYABLE_STATUS_CODES.includes(this.statusCode);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

/**
 * Token provider function type.
 * Returns the current auth token or null if not authenticated.
 */
type TokenProvider = () => string | null | Promise<string | null>;

/**
 * Configuration options for the API client.
 */
interface ApiClientConfig {
  baseUrl: string;
  defaultTimeout?: number;
  maxRetries?: number;
  tokenProvider?: TokenProvider;
  onAuthError?: () => void;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;
  private tokenProvider: TokenProvider | null = null;
  private onAuthError: (() => void) | null = null;

  constructor(config: ApiClientConfig | string) {
    if (typeof config === 'string') {
      this.baseUrl = config;
      this.defaultTimeout = DEFAULT_TIMEOUT;
      this.maxRetries = MAX_RETRIES;
    } else {
      this.baseUrl = config.baseUrl;
      this.defaultTimeout = config.defaultTimeout ?? DEFAULT_TIMEOUT;
      this.maxRetries = config.maxRetries ?? MAX_RETRIES;
      this.tokenProvider = config.tokenProvider ?? null;
      this.onAuthError = config.onAuthError ?? null;
    }
  }

  /**
   * Set the token provider for authentication.
   */
  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
  }

  /**
   * Set the callback for authentication errors.
   */
  setAuthErrorHandler(handler: () => void): void {
    this.onAuthError = handler;
  }

  /**
   * Get the authentication token.
   */
  private async getToken(): Promise<string | null> {
    if (!this.tokenProvider) return null;
    return this.tokenProvider();
  }

  /**
   * Create an AbortController with timeout.
   */
  private createTimeoutController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  /**
   * Sleep for a specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Parse error response from the API.
   */
  private parseErrorResponse(
    response: Response,
    errorData: Partial<ApiErrorResponse>
  ): ApiError {
    const errorCode = (errorData.error_code as ApiErrorCode) || 'UNKNOWN_ERROR';
    const message =
      ERROR_MESSAGES[errorCode] || errorData.message || 'An unexpected error occurred';

    return new ApiError(message, errorCode, response.status, errorData.details);
  }

  /**
   * Make an HTTP request with timeout and retry logic.
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions & { body?: string } = {}
  ): Promise<T> {
    const {
      params,
      timeout = this.defaultTimeout,
      retries = this.maxRetries,
      skipAuth = false,
      ...fetchOptions
    } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add auth token if available and not skipped
    if (!skipAuth) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const controller = this.createTimeoutController(timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = this.parseErrorResponse(response, errorData);

          // Handle auth errors
          if (error.isAuthError && this.onAuthError) {
            this.onAuthError();
          }

          // Don't retry non-retryable errors
          if (!error.isRetryable || attempt >= retries) {
            throw error;
          }

          lastError = error;
        } else {
          // Handle 204 No Content
          if (response.status === 204) {
            return undefined as T;
          }
          return response.json();
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        // Handle timeout/abort
        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new ApiError(
            'Request timed out. Please try again.',
            'SERVICE_UNAVAILABLE',
            408
          );
        } else if (error instanceof TypeError) {
          // Network error
          lastError = new ApiError(
            'Unable to connect to the server. Please check your connection.',
            'SERVICE_UNAVAILABLE',
            0
          );
        } else {
          lastError = error as Error;
        }

        // Don't retry if we've exhausted attempts
        if (attempt >= retries) {
          throw lastError;
        }
      }

      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await this.sleep(delay);
      attempt++;
    }

    throw lastError ?? new Error('Request failed');
  }

  /**
   * Make a GET request.
   */
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request.
   */
  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a PUT request.
   */
  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a PATCH request.
   */
  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a DELETE request.
   */
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export the default API client instance
export const api = new ApiClient(API_URL);

// Export the class for custom instances
export { ApiClient };
