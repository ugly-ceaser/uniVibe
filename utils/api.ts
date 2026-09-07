import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { config, getHealthUrl, log } from '@/config/environment';
import type { CourseMaterial, CourseMaterialUpload } from '@/types/course';
import {
  normalizeCourse,
  normalizeCourses,
  normalizeCourseMaterial,
  normalizeCourseMaterials,
} from '@/utils/course';
import { normalizeGuide, normalizeGuides } from '@/utils/guide';
import { ApiResponse } from '@/types/api';
import { Guide } from '@/types';
import { Category, LikeResponse } from '@/types';
import {
  PaginationMeta,
  QuestionSummary,
  UserProfile,
  UpdateProfileRequest,
  ProfileApiResponse,
  UniversityHierarchyItem,
  FacultyHierarchyItem,
  DepartmentHierarchyItem,
  ProgrammeHierarchyItem,
  LevelHierarchyItem,
  SemesterHierarchyItem,
  MapLocation,
  MapApiClient,
  NotificationItem,
  NotificationListResponse,
} from './types';

// ------------------------
// Base setup
// ------------------------

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  public status: number;
  public requestId: string | undefined;
  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

/**
 * Numeric HTTP status codes the app specifically handles.
 * Use with isApiError() in screens for type-safe error branching.
 */
export const ApiErrorCode = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Type-safe guard — narrows an unknown catch value to ApiError and
 * optionally checks it against a specific HTTP status code.
 *
 * @example
 * catch (err) {
 *   if (isApiError(err, ApiErrorCode.CONFLICT)) {
 *     setError('That username is already taken.');
 *   } else {
 *     setError('Something went wrong.');
 *   }
 * }
 */
export function isApiError(
  err: unknown,
  status?: number
): err is ApiError {
  if (!(err instanceof ApiError)) return false;
  return status === undefined || err.status === status;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Validation Error',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

// ------------------------
// ApiClient
// ------------------------
export class ApiClient {
  private baseURL: string;
  private token?: string;
  private sessionInvalidationHandler?: () => void;

  setSessionInvalidationHandler(handler: (() => void) | undefined) {
    this.sessionInvalidationHandler = handler;
  }
  private readonly requestTimeout: number;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimestamps = new Map<string, number>();
  private cacheGeneration = 0;
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly MIN_REQUEST_INTERVAL = 100;
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds

  constructor(
    baseURL: string = config.api.baseUrl,
    requestTimeout: number = config.api.timeout
  ) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.requestTimeout = requestTimeout;
  }

  async testConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(getHealthUrl(this.baseURL), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      return response.ok;
    } catch (error) {
      log.debug(
        'API health check failed',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  setToken(token: string) {
    if (this.token !== token) {
      this.clearCache();
    }
    this.token = token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  clearToken() {
    this.token = undefined;
    this.clearCache(); // Clear cache on logout
  }

  public clearCache() {
    this.cacheGeneration += 1;
    this.cache.clear();
    this.pendingRequests.clear();
    this.requestTimestamps.clear();
  }

  public clearPendingRequests() {
    this.pendingRequests.clear();
  }

  public getDebugInfo() {
    return {
      pendingRequests: Array.from(this.pendingRequests.keys()),
      cacheKeys: Array.from(this.cache.keys()),
      baseURL: this.baseURL,
      hasToken: !!this.token,
    };
  }

  private getCacheKey(endpoint: string, method: string = 'GET'): string {
    return `${method}:${endpoint}`;
  }

  private isRequestCached(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    const now = Date.now();
    const isExpired = now - cached.timestamp > cached.ttl;

    if (isExpired) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  private getCachedData<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    return cached ? cached.data : null;
  }

  private setCacheData(
    cacheKey: string,
    data: any,
    ttl: number = this.DEFAULT_CACHE_TTL
  ) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private shouldThrottleRequest(requestKey: string): boolean {
    const lastRequestTime = this.requestTimestamps.get(requestKey);
    if (!lastRequestTime) return false;

    const timeSinceLastRequest = Date.now() - lastRequestTime;
    return timeSinceLastRequest < this.MIN_REQUEST_INTERVAL;
  }

  private async waitForThrottle(requestKey: string): Promise<void> {
    const lastRequestTime = this.requestTimestamps.get(requestKey);
    if (!lastRequestTime) return;

    const timeSinceLastRequest = Date.now() - lastRequestTime;
    const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = true,
    cacheTTL: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    const method = options.method || 'GET';
    const requestKey = `${method}:${endpoint}`;
    const cacheKey = this.getCacheKey(endpoint, method);
    const requestCacheGeneration = this.cacheGeneration;

    // Check cache for GET requests
    if (method === 'GET' && useCache && this.isRequestCached(cacheKey)) {
      return this.getCachedData<T>(cacheKey)!;
    }

    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    // Check if we need to throttle this request
    if (this.shouldThrottleRequest(requestKey)) {
      await this.waitForThrottle(requestKey);
    }

    const requestPromise = this._makeRequest<T>(endpoint, options);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      this.requestTimestamps.set(requestKey, Date.now());

      // Cache GET requests
      if (
        method === 'GET' &&
        useCache &&
        requestCacheGeneration === this.cacheGeneration
      ) {
        this.setCacheData(cacheKey, result, cacheTTL);
      }

      // Clear cache for mutations that might affect other data
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        this.invalidateRelatedCache(endpoint);
      }

      return result;
    } finally {
      if (this.pendingRequests.get(requestKey) === requestPromise) {
        this.pendingRequests.delete(requestKey);
      }
    }
  }

  private invalidateRelatedCache(_endpoint: string) {
    // Mutations may affect lists, counters, related resources, and permissions.
    // Prefer correctness over retaining potentially stale GET responses.
    this.cacheGeneration += 1;
    this.cache.clear();
  }

  private async _makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Build headers safely so we don't force JSON for FormData
    const mergedHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!mergedHeaders['Content-Type'] && !isFormData) {
      mergedHeaders['Content-Type'] = 'application/json';
    }
    const requestToken = this.token;
    if (requestToken) {
      mergedHeaders['Authorization'] = `Bearer ${requestToken}`;
    }

    const requestPath = endpoint.split('?')[0];
    log.debug(`${options.method || 'GET'} ${requestPath}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const fetchOptions = {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);

      if (response.status === 429) {
        throw new ApiError(
          'Rate limit reached. Please wait a moment and try again.',
          429
        );
      }

      if (!response.ok) {
        // Invalidate only the session that sent this request. A late response
        // from a previous account must never sign out a newly logged-in user.
        if (response.status === 401 && requestToken && this.token === requestToken) {
          this.clearToken();
          this.sessionInvalidationHandler?.();
        }
        const errorData = await this.parseResponseBody(response);

        throw new ApiError(
          (this.isRecord(errorData) &&
            typeof errorData.message === 'string' &&
            errorData.message) ||
            `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.headers.get('x-request-id') || undefined
        );
      }

      return (await this.parseResponseBody(response)) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          `Request timed out after ${Math.ceil(
            this.requestTimeout / 1000
          )} seconds. Please try again.`,
          408
        );
      }

      if (error instanceof TypeError) {
        throw new ApiError(
          'Network connection failed. Please check your internet connection.',
          0
        );
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    if (response.status === 204 || response.status === 205) {
      return undefined;
    }

    const body = await response.text();
    if (!body) {
      return undefined;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('json')) {
      try {
        return JSON.parse(body);
      } catch {
        throw new ApiError('Invalid response format from server.', 500);
      }
    }

    return body;
  }

  // Helper methods with caching control
  async get<T>(endpoint: string, useCache: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, useCache);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData =
      typeof FormData !== 'undefined' && data instanceof FormData;
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: isFormData ? data : data ? JSON.stringify(data) : undefined,
        // do not set headers here; _makeRequest will set Content-Type correctly
      },
      false
    );
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData =
      typeof FormData !== 'undefined' && data instanceof FormData;
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      },
      false
    );
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData =
      typeof FormData !== 'undefined' && data instanceof FormData;
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      },
      false
    );
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, false);
  }

  // Authenticated requests
  async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false
  ): Promise<T> {
    if (!this.token) {
      throw new ApiError('Authentication required', 401);
    }
    return this.request<T>(endpoint, options, useCache);
  }

  async authGet<T>(endpoint: string, useCache: boolean = true): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, { method: 'GET' }, useCache);
  }

  async authPost<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData =
      typeof FormData !== 'undefined' && data instanceof FormData;
    return this.authenticatedRequest<T>(endpoint, {
      method: 'POST',
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async authPut<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData =
      typeof FormData !== 'undefined' && data instanceof FormData;
    return this.authenticatedRequest<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async authPatch<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData =
      typeof FormData !== 'undefined' && data instanceof FormData;
    return this.authenticatedRequest<T>(endpoint, {
      method: 'PATCH',
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async authDelete<T>(endpoint: string): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, { method: 'DELETE' });
  }

  // Force refresh methods (bypass cache)
  async forceRefresh<T>(endpoint: string): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, 'GET');
    this.cacheGeneration += 1;
    const refreshGeneration = this.cacheGeneration;
    this.cache.delete(cacheKey);
    this.pendingRequests.delete(cacheKey);
    const data = await this.get<T>(endpoint, false);
    if (refreshGeneration === this.cacheGeneration) {
      this.setCacheData(cacheKey, data);
    }
    return data;
  }
}

// Create a global instance of ApiClient
const apiClient = new ApiClient();

// ------------------------
// useApi hook
// ------------------------
export const useApi = () => {
  const { token } = useAuth();

  React.useEffect(() => {
    if (token) apiClient.setToken(token);
    else apiClient.clearToken();
  }, [token]);

  const authenticatedRequest = React.useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (error: unknown) {
        if (error instanceof ApiError) {
          // Session invalidation happens in the shared client for every method.
          if (error.status === 401) {
            // The root navigator returns the user to login without an alert.
          } else if (error.status === 403) {
            // ── 403: Access denied ────────────────────────────────────────
            // Global interception: user lacks permission for this resource.
            // No individual screen has enough context to handle this better.
            Alert.alert(
              'Access Denied',
              "You don't have permission to perform this action.",
              [{ text: 'OK' }]
            );
          } else {
            // ── All other API errors (400, 404, 422, 429, 5xx) ───────────
            // Silently rethrow — every screen owns its own error/retry UI.
            // Log in development only so we don't lose debugging signal.
            log.error(
              `[API ${error.status}] ${error.message}`,
              error.requestId ? `requestId=${error.requestId}` : ''
            );
          }
        } else {
          // ── Network / timeout / unexpected JS errors ──────────────────
          // Rethrow so the calling screen can show its own error state.
          // Log for debugging — this covers CORS failures, offline, etc.
          log.error(
            '[Network Error]',
            error instanceof Error ? error.message : String(error)
          );
        }

        throw error; // always rethrow so screens can catch and react
      }
    },
    []
  );

  // Return a stable API object to avoid re-creating functions every render
  const api = React.useMemo(
    () => ({
      // public
      get: <T>(endpoint: string, useCache: boolean = false) =>
        apiClient.get<T>(endpoint, useCache),
      post: <T>(endpoint: string, data?: any) =>
        apiClient.post<T>(endpoint, data),
      put: <T>(endpoint: string, data?: any) =>
        apiClient.put<T>(endpoint, data),
      patch: <T>(endpoint: string, data?: any) =>
        apiClient.patch<T>(endpoint, data),
      delete: <T>(endpoint: string) => apiClient.delete<T>(endpoint),

      // authenticated (adds JWT + handles 401/403)
      authGet: <T>(endpoint: string, useCache: boolean = true) =>
        authenticatedRequest(() => apiClient.authGet<T>(endpoint, useCache)),
      authPost: <T>(endpoint: string, data?: any) =>
        authenticatedRequest(() => apiClient.authPost<T>(endpoint, data)),
      authPut: <T>(endpoint: string, data?: any) =>
        authenticatedRequest(() => apiClient.authPut<T>(endpoint, data)),
      authPatch: <T>(endpoint: string, data?: any) =>
        authenticatedRequest(() => apiClient.authPatch<T>(endpoint, data)),
      authDelete: <T>(endpoint: string) =>
        authenticatedRequest(() => apiClient.authDelete<T>(endpoint)),

      // Additional methods
      authenticatedRequest: <T>(fn: () => Promise<T>) =>
        authenticatedRequest(fn),
      forceRefresh: <T>(endpoint: string) =>
        apiClient.forceRefresh<T>(endpoint),
      getBaseURL: () => apiClient.getBaseURL(),
      getToken: () => apiClient.getToken(),

      // 🐛 Debug methods
      clearCache: () => apiClient.clearCache(),
      clearPendingRequests: () => apiClient.clearPendingRequests(),
      getDebugInfo: () => apiClient.getDebugInfo(),
    }),
    [authenticatedRequest]
  );

  return api;
};

// ------------------------
// Auth API
// ------------------------
export const authApi = {
  register: (user: {
    username: string;
    firstname: string;
    middlename?: string | null;
    lastname: string;
    email: string;
    password: string;
  }) => apiClient.post('/auth/register', user),
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  checkUsername: (username: string) =>
    apiClient.post<{ available: boolean }>('/auth/check-username', {
      username,
    }),
};

// ------------------------
// Courses API
// ------------------------
export const coursesApi = (api: ReturnType<typeof useApi>) => ({
  // ─── Official Courses ────────────────────────────────────────────────
  getAll: async (filters?: {
    universityId?: string;
    facultyId?: string;
    departmentId?: string;
    programmeId?: string;
    levelId?: string;
    semesterId?: string;
  }) => {
    const params = filters
      ? '?' +
        new URLSearchParams(
          Object.entries(filters).filter(([, v]) => !!v) as any
        ).toString()
      : '';
    const response = await api.authGet<{ data: unknown }>(
      `/courses${params}`,
      false
    );
    return { ...response, data: normalizeCourses(response.data) };
  },
  getById: async (id: string) => {
    const response = await api.authGet<{ data: unknown }>(`/courses/${id}`);
    return { ...response, data: normalizeCourse(response.data) };
  },
  search: async (q: string, universityId?: string) => {
    const params = new URLSearchParams({
      q,
      ...(universityId ? { universityId } : {}),
    });
    const response = await api.authGet<{ data: unknown }>(
      `/courses/search?${params.toString()}`,
      false
    );
    return { ...response, data: normalizeCourses(response.data) };
  },

  // ─── Selected/Enrolled Courses ─────────────────────────────────────────
  getSelected: async () => {
    const response = await api.authGet<{ data: unknown }>(
      '/courses/selected',
      false
    );
    return { ...response, data: normalizeCourses(response.data) };
  },
  enroll: (id: string) =>
    api.authPost<{ message: string }>(`/courses/${id}/enroll`),
  unenroll: (id: string) =>
    api.authPost<{ message: string }>(`/courses/${id}/unenroll`),

  // ─── University Hierarchy Browser ───────────────────────────────────
  getUniversities: (country?: string, state?: string) => {
    const params = new URLSearchParams(
      Object.entries({ country, state }).filter(([, v]) => !!v) as any
    ).toString();
    return api.get<{ data: UniversityHierarchyItem[] }>(
      `/courses/universities${params ? '?' + params : ''}`,
      true
    );
  },
  getFaculties: (universityId: string) =>
    api.get<{ data: FacultyHierarchyItem[] }>(
      `/courses/universities/${universityId}/faculties`,
      true
    ),
  getDepartments: (facultyId: string) =>
    api.get<{ data: DepartmentHierarchyItem[] }>(
      `/courses/faculties/${facultyId}/departments`,
      true
    ),
  getProgrammes: (departmentId: string) =>
    api.get<{ data: ProgrammeHierarchyItem[] }>(
      `/courses/departments/${departmentId}/programmes`,
      true
    ),
  getLevels: (programmeId: string) =>
    api.get<{ data: LevelHierarchyItem[] }>(
      `/courses/programmes/${programmeId}/levels`,
      true
    ),
  getSemesters: (programmeId: string) =>
    api.get<{ data: SemesterHierarchyItem[] }>(
      `/courses/programmes/${programmeId}/semesters`,
      true
    ),

  // ─── Submission Workflow ─────────────────────────────────────────────
  submitCourse: (data: {
    universityId: string;
    facultyId: string;
    departmentId: string;
    programmeId: string;
    levelId: string;
    semesterId: string;
    courseCode: string;
    title: string;
    creditUnit: number;
    note?: string;
  }) =>
    api.authPost<{ type: string; message: string; data: any }>(
      '/courses/submissions',
      data
    ),

  listSubmissions: (filters?: {
    universityId?: string;
    facultyId?: string;
    departmentId?: string;
    status?: string;
  }) => {
    const params = filters
      ? '?' +
        new URLSearchParams(
          Object.entries(filters).filter(([, v]) => !!v) as any
        ).toString()
      : '';
    return api.authGet<{ data: any[] }>(`/courses/submissions${params}`, false);
  },

  getSubmission: (id: string) =>
    api.authGet<{ data: any }>(`/courses/submissions/${id}`, false),

  approveSubmission: (id: string, courseType?: string) =>
    api.authPost<{ message: string; data: any }>(
      `/courses/submissions/${id}/approve`,
      { courseType }
    ),

  rejectSubmission: (id: string, reason?: string) =>
    api.authPost<{ message: string }>(`/courses/submissions/${id}/reject`, {
      reason,
    }),

  bulkApprove: (submissionIds: string[]) =>
    api.authPost<{ approved: number; failed: number; total: number }>(
      '/courses/submissions/bulk-approve',
      { submissionIds }
    ),

  // ─── Legacy Course Requests (backward compat) ────────────────────────
  getRequestStatus: () => api.authGet<any>('/courses/requests/status', false),
  submitRequest: (data: any) => api.authPost<any>('/courses/requests', data),
});

// ------------------------
// Course Materials API
// ------------------------
export const courseMaterialsApi = (api: ReturnType<typeof useApi>) => ({
  list: async (courseId: string): Promise<{ data: CourseMaterial[] }> => {
    const response = await api.authGet<{ data: unknown }>(
      `/courses/${courseId}/materials`,
      false
    );
    const payload = response.data as
      | unknown[]
      | { materials?: unknown[] }
      | undefined;
    const values = Array.isArray(payload) ? payload : payload?.materials;
    return { ...response, data: normalizeCourseMaterials(values) };
  },

  upload: async (
    courseId: string,
    file: CourseMaterialUpload
  ): Promise<{ data: CourseMaterial }> => {
    const body = new FormData();
    if (file.webFile) {
      body.append('file', file.webFile, file.name);
    } else {
      body.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
    }

    const response = await api.authPost<{ data: unknown }>(
      `/courses/${courseId}/materials`,
      body
    );
    const payload = response.data as { material?: unknown } | undefined;
    return {
      ...response,
      data: normalizeCourseMaterial(payload?.material ?? response.data),
    };
  },

  uploadWithProgress: async (
    courseId: string,
    file: CourseMaterialUpload,
    onProgress?: (pct: number) => void
  ): Promise<{ data: CourseMaterial }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${api.getBaseURL()}/courses/${courseId}/materials`;

      xhr.open('POST', url);

      const token = api.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = event => {
          if (event.lengthComputable && event.total > 0) {
            const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            const payload = parsed.data || parsed;
            onProgress?.(100);
            resolve({
              data: normalizeCourseMaterial(payload?.material ?? payload),
            });
          } catch {
            onProgress?.(100);
            resolve({
              data: normalizeCourseMaterial({ name: file.name }),
            });
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };

      const body = new FormData();
      if (file.webFile) {
        body.append('file', file.webFile, file.name);
      } else {
        body.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        } as any);
      }

      xhr.send(body);
    });
  },
});

// ------------------------
// AI Chat API - Updated to match backend specifications
// ------------------------
export interface AIChatRequest {
  message: string;
  courseId: string;
  context: {
    courseCode: string;
    courseName: string;
    outline?: string[];
    assessment?: Array<{ type: string; percentage: number }>;
    instructor?: string;
    description?: string;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMode?: 'fast' | 'balanced' | 'smart';
}

export interface GeneralChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMode?: 'fast' | 'balanced' | 'smart';
}

export interface AcademicChatRequest {
  message: string;
  studentContext: {
    studentId: string;
    currentGPA?: number;
    enrolledCourses?: string[];
    completedCourses?: string[];
    strugglingSubjects?: string[];
    studyHours?: number;
    activeForumPosts?: number;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMode?: 'fast' | 'balanced' | 'smart';
}

export interface AIChatResponse {
  response: string;
  confidence: number;
  sources?: string[];
  suggestions?: string[];
  cached: boolean;
  model: string;
  tokensUsed?: number;
  estimatedCost?: number;
  is_supplementary?: boolean;
}

// Backend API response wrapper
export interface AIApiResponse {
  data: AIChatResponse;
  message: string;
  timestamp: string;
  sessionId?: string;
}

// Course session response format
export interface CourseSessionResponse {
  data: {
    session: {
      id: string;
      studentId: string;
      courseId: string;
      title: string;
      createdAt: string;
      messages: Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        createdAt: string;
      }>;
    };
    course: {
      id: string;
      name: string;
      code: string;
    };
  };
  message: string;
}

// Course chats list response format
export interface CourseChatsListResponse {
  data: {
    course: {
      id: string;
      name: string;
      code: string;
    };
    sessions: Array<{
      id: string;
      title: string;
      createdAt: string;
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        createdAt: string;
      }>;
      _count: {
        messages: number;
      };
    }>;
  };
  message: string;
}

export interface ChatSession {
  id: string;
  studentId: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  _count: {
    messages: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface CourseInsights {
  studyPlan: string[];
  keyTopics: string[];
  assessmentTips: string[];
  resources: string[];
  difficultyRating: string;
  estimatedStudyHours: number;
}

export interface PersonalizedRecommendations {
  recommendations: string[];
  focusAreas: string[];
  timeAllocation: Record<string, number>;
  nextSteps: string[];
}

export interface CourseChatSession {
  id: string;
  courseId: string;
  studentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  _count: {
    messages: number;
  };
}

export interface CourseChatsResponse {
  data: {
    course: {
      id: string;
      name: string;
      code: string;
    };
    sessions: Array<{
      id: string;
      title: string;
      createdAt: string;
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        createdAt: string;
      }>;
      _count: {
        messages: number;
      };
    }>;
  };
  message: string;
}

export const aiApi = (api: ReturnType<typeof useApi>) => ({
  // Course-specific AI chat
  courseChat: (data: AIChatRequest) => {
    return api.authPost<AIApiResponse>('/ai/chat/course', data);
  },

  // General AI chat
  generalChat: (data: GeneralChatRequest) => {
    return api.authPost<AIApiResponse>('/ai/chat/general', data);
  },

  // Academic progress AI chat
  academicChat: (data: AcademicChatRequest) => {
    return api.authPost<ApiResponse<AIChatResponse>>('/ai/chat/academic', data);
  },

  // Get course insights and study recommendations
  getCourseInsights: (courseId: string) => {
    return api.authGet<ApiResponse<CourseInsights>>(
      `/ai/insights/course/${courseId}`
    );
  },

  // Get personalized recommendations for a course
  getPersonalizedRecommendations: (
    courseId: string,
    studentData?: {
      completedTopics?: string[];
      strugglingAreas?: string[];
      studyHours?: number;
      lastAssignmentScore?: number;
      attendanceRate?: number;
      forumParticipation?: string;
    }
  ) => {
    return api.authPost<ApiResponse<PersonalizedRecommendations>>(
      `/ai/recommendations/course/${courseId}`,
      {
        studentData,
      }
    );
  },

  // Chat session management
  getChatSessions: () => {
    return api.authGet<ApiResponse<ChatSession[]>>('/ai/sessions');
  },

  getChatSession: (sessionId: string) => {
    return api.authGet<ApiResponse<ChatSession>>(`/ai/sessions/${sessionId}`);
  },

  deleteChatSession: (sessionId: string) => {
    return api.authDelete<ApiResponse<void>>(`/ai/sessions/${sessionId}`);
  },

  // Course-specific chat session management
  getCourseChatSessions: (courseId: string) => {
    return api.authGet<CourseChatsListResponse>(
      `/ai/courses/${courseId}/chats`
    );
  },

  getCourseActiveSession: (courseId: string) => {
    return api.authGet<CourseSessionResponse>(
      `/ai/courses/${courseId}/chats/session`
    );
  },

  // Enhanced course chat with automatic session management
  courseChatWithSession: (data: AIChatRequest) => {
    return api.authPost<AIApiResponse>('/ai/chat/course', data);
  },

  // Legacy method for backward compatibility
  generalUniversityChat: (
    message: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => {
    return api.authPost<ApiResponse<AIChatResponse>>('/ai/chat/general', {
      message,
      conversationHistory,
      userMode: 'balanced',
    });
  },
});

// ------------------------
// Forum API - UPDATED to match your backend endpoints
// ------------------------
export interface QuestionDetail {
  id: string;
  title: string;
  body: string;
  forumId?: string;
  status: 'Cleared' | 'Pending' | 'Closed' | 'Open';
  authorId?: string;
  createdAt: string;
  category?: string;
  department?: string;
  courseCode?: string;
  viewCount?: number;
  views?: number;
  score?: number;
  reactionCount?: number;
  likes?: number;
  isLiked?: boolean;
  answerCount?: number;
  author?: {
    id: string;
    fullname: string;
    email?: string;
    department?: string;
    faculty?: string;
    level?: number;
    username?: string;
    avatarUrl?: string;
  } | null;
  forum?: {
    id: string;
    name: string;
  } | null;
  answers: Answer[];
  _count?: {
    answers: number;
  };
}

export interface Answer {
  id: string;
  body: string;
  authorId?: string;
  questionId: string;
  status?: 'Cleared' | 'Pending' | 'Closed';
  createdAt: string;
  commentsCount?: number;
  author?: {
    id: string;
    fullname: string;
    email?: string;
    department?: string;
    faculty?: string;
    level?: number;
    username?: string;
    avatarUrl?: string;
  } | null;
  _count?: {
    comments: number;
  };
}

export type ForumComment = {
  id: string;
  body: string;
  createdAt: string;
  author?: {
    fullname?: string;
    id?: string;
    department?: string;
    faculty?: string;
    level?: number;
  } | null;
  parentId?: string | null;
  answerId?: string;
};

export type ForumCommentNode = {
  id: string;
  body: string;
  createdAt?: string;
  author?: {
    id?: string;
    fullname?: string;
    department?: string;
    faculty?: string;
    level?: number;
  } | null;
  replies?: ForumCommentNode[];
};

export type Paginated<T> = {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export const forumApi = (api: ReturnType<typeof useApi>) => ({
  // ===== QUESTIONS =====

  /**
   * GET /api/v1/forum/questions - List All Questions
   * Supports pagination and filtering
   */
  getQuestions: async (params: {
    page: number;
    pageSize: number;
    refresh?: boolean; // when true, bypass cache
    category?: string; // e.g. TECH_AND_PROGRAMMING (enum)
    forumId?: string;
    cursor?: string;
    profileName?: 'forum' | 'homeTrending';
  }) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page));
    qs.set('pageSize', String(params.pageSize));
    if (params.category) qs.set('category', params.category);
    if (params.forumId) qs.set('forumId', params.forumId);
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.profileName) qs.set('profileName', params.profileName);

    const endpoint = `/forum/questions${
      qs.toString() ? `?${qs.toString()}` : ''
    }`;

    // api.get(url, useCache). Use cache unless refresh is true.
    return api.authGet(endpoint, !(params.refresh ?? false));
  },

  /**
   * GET /api/v1/forum/questions/:id - Get Single Question with All Answers
   */
  getQuestion: (questionId: string, refresh?: boolean) => {
    const endpoint = `/forum/questions/${questionId}`;
    const cacheTTL = refresh ? 0 : 30000; // 30 seconds for individual posts
    return api.authGet<{ data: QuestionDetail }>(endpoint, !refresh);
  },

  /**
   * POST /api/v1/forum/questions - Create Question
   */
  createQuestion: async (payload: {
    title: string;
    body: string;
    category:
      | 'GENERAL_DISCUSSION'
      | 'ACADEMIC_HELP'
      | 'STUDENT_LIFE'
      | 'CAREER_AND_INTERNSHIPS'
      | 'TECH_AND_PROGRAMMING'
      | 'CAMPUS_SERVICES';
    forumId?: string;
    courseCode?: string;
    department?: string;
  }) => {
    const endpoint = `/forum/questions`;
    return api.authPost(endpoint, payload);
  },

  /**
   * PUT /api/v1/forum/questions/:id - Update Question (if supported)
   */
  updateQuestion: (
    questionId: string,
    data: {
      title?: string;
      body?: string;
      tags?: string[];
    }
  ) => {
    return api.authPut<ApiResponse<ForumPost>>(
      `/forum/questions/${questionId}`,
      data
    );
  },

  /**
   * DELETE /api/v1/forum/questions/:id - Delete Question (if supported)
   */
  deleteQuestion: (questionId: string) => {
    return api.authDelete<ApiResponse<void>>(`/forum/questions/${questionId}`);
  },

  /**
   * POST /api/v1/forum/questions/:id/report - Report Question
   */
  reportQuestion: (questionId: string, reason: string) => {
    return api.authPost<ApiResponse<any>>(
      `/forum/questions/${questionId}/report`,
      { reason }
    );
  },

  // ===== ANSWERS =====

  /**
   * POST /api/v1/forum/questions/:id/answers - Add Answer to Question
   */
  addAnswer: (
    questionId: string,
    data: {
      body: string;
      isAnonymous?: boolean;
    }
  ) => {
    return api.authPost<ApiResponse<Answer>>(
      `/forum/questions/${questionId}/answers`,
      data
    );
  },

  /**
   * PUT /api/v1/forum/answers/:id - Update Answer (if supported)
   */
  updateAnswer: (answerId: string, data: { body: string }) => {
    return api.authPut<ApiResponse<Answer>>(`/forum/answers/${answerId}`, data);
  },

  /**
   * DELETE /api/v1/forum/answers/:id - Delete Answer (if supported)
   */
  deleteAnswer: (answerId: string) => {
    return api.authDelete<ApiResponse<void>>(`/forum/answers/${answerId}`);
  },

  /**
   * POST /api/v1/forum/answers/:id/vote - Vote on Answer (if supported)
   */
  voteAnswer: (answerId: string, vote: 'up' | 'down') => {
    return api.authPost<ApiResponse<{ score: number }>>(
      `/forum/answers/${answerId}/vote`,
      { vote }
    );
  },

  // ===== COMMENTS =====

  /**
   * GET /api/v1/forum/answers/:id/comments - Get Comments for Answer
   */
  getComments: (answerId: string, refresh?: boolean) => {
    const endpoint = `/forum/answers/${answerId}/comments`;
    return api.get<ApiResponse<Comment[]>>(endpoint, !refresh);
  },

  /**
   * POST /api/v1/forum/comments - Create Comment/Reply
   */
  addComment: (data: {
    body: string;
    answerId?: string;
    questionId?: string;
    parentId?: string; // For nested replies
    isAnonymous?: boolean;
  }) => {
    return api.authPost<ApiResponse<Comment>>('/forum/comments', data);
  },

  /**
   * PUT /api/v1/forum/comments/:id - Update Comment (if supported)
   */
  updateComment: (commentId: string, data: { body: string }) => {
    return api.authPut<ApiResponse<Comment>>(
      `/forum/comments/${commentId}`,
      data
    );
  },

  /**
   * DELETE /api/v1/forum/comments/:id - Delete Comment (if supported)
   */
  deleteComment: (commentId: string) => {
    return api.authDelete<ApiResponse<void>>(`/forum/comments/${commentId}`);
  },

  // ===== FORUMS/CATEGORIES =====

  /**
   * GET /api/v1/forum/forums - List All Forums/Categories
   */
  getForums: (refresh?: boolean) => {
    const cacheTTL = 300000; // 5 minutes for forums list
    return api.get<ApiResponse<Forum[]>>('/forum/forums', !refresh);
  },

  /**
   * POST /api/v1/forum/forums - Create Forum (Admin only)
   */
  createForum: (data: {
    name: string;
    description?: string;
    isPrivate?: boolean;
  }) => {
    return api.authPost<ApiResponse<Forum>>('/forum/forums', data);
  },

  // ===== SEARCH & FILTERING =====

  /**
   * GET /api/v1/forum/search - Search Questions
   */
  searchQuestions: (params: {
    query: string;
    forumId?: string;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('q', params.query);
    if (params.forumId) queryParams.append('forumId', params.forumId);
    if (params.tags)
      params.tags.forEach(tag => queryParams.append('tags', tag));
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());

    const endpoint = `/forum/search?${queryParams.toString()}`;
    return api.get<ApiResponse<ForumPost[]>>(endpoint, false); // Don't cache search results
  },

  // ===== UTILITY METHODS =====

  /**
   * Force refresh specific question and clear related cache
   */
  refreshQuestion: async (questionId: string) => {
    return api.forceRefresh<{ data: QuestionDetail }>(
      `/forum/questions/${questionId}`
    );
  },

  /**
   * Force refresh questions list
   */
  refreshQuestions: async (params?: { forumId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.forumId) queryParams.append('forumId', params.forumId);

    const endpoint = `/forum/questions${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return api.forceRefresh<ApiResponse<ForumPost[]>>(endpoint);
  },

  /**
   * Clear all forum-related cache
   */
  clearCache: () => {
    api.clearCache();
  },

  listCategories: () =>
    api.get<{ data: Category[] }>('/forum/categories', false),

  listQuestions: (params?: {
    categoryId?: string;
    forumId?: string;
    query?: string;
    sort?: 'new' | 'top';
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.forumId) qs.set('forumId', params.forumId);
    if (params?.query) qs.set('q', params.query);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<{ data: QuestionSummary[]; meta: PaginationMeta }>(
      `/forum/questions${suffix}`,
      false
    );
  },

  // Reply to an existing answer (backend: POST /api/v1/forum/comments)
  replyToAnswer: async (params: {
    answerId: string;
    body: string;
    parentId?: string;
  }) => {
    return api.authPost('/forum/comments', {
      body: params.body,
      answerId: params.answerId,
      ...(params.parentId ? { parentId: params.parentId } : {}),
    });
  },

  // Public: list all replies tree under an answer (top-level + nested)
  getAnswerComments: async (answerId: string) => {
    return api.authGet<ForumCommentNode[]>(
      `/forum/answers/${answerId}/comments`,
      true
    );
  },
});

// ------------------------
// Add missing type definitions for Forum API
// ------------------------
export interface Comment {
  id: string;
  body: string;
  answerId?: string;
  parentId?: string;
  authorId: string;
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Forum {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Update ForumPost interface to match your backend structure
export interface ForumPost {
  id: string;
  title: string;
  body: string;
  forumId?: string;
  forum?: Forum;
  authorId?: string;
  author?: {
    id: string;
    fullname: string;
    email?: string;
    department?: string;
    faculty?: string;
    level?: number;
    username?: string;
    avatarUrl?: string;
  } | null;
  answers?: Answer[];
  tags?: string[];
  views?: number;
  viewCount?: number;
  votes?: number;
  reactionCount?: number;
  answerCount?: number;
  isResolved?: boolean;
  category?: string;
  department?: string;
  courseCode?: string;
  createdAt: string;
  updatedAt?: string;
  // Additional properties for UI
  isLiked?: boolean;
  likes?: number;
  status?: 'Cleared' | 'Pending' | 'Closed';
  _count?: {
    answers: number;
  };
  score?: number;
}

// ------------------------
// Guide API - FIXED to match backend routes
// ------------------------
export const guideApi = (api: ReturnType<typeof useApi>) => ({
  // Guide CRUD operations - Fixed endpoints to match backend
  getAll: async () => {
    const response = await api.authGet<ApiResponse<unknown>>('/guide');
    const payload = response.data as { guides?: unknown[] } | unknown[];
    const guides = Array.isArray(payload) ? payload : payload?.guides;
    return { ...response, data: normalizeGuides(guides) };
  },
  getById: async (id: string) => {
    const response = await api.authGet<ApiResponse<unknown>>(`/guide/${id}`);
    const payload = response.data as { guide?: unknown };
    return {
      ...response,
      data: normalizeGuide(payload?.guide ?? response.data),
    };
  },
  create: (data: Partial<Guide>) => {
    return api.authPost<ApiResponse<Guide>>('/guide', data);
  },
  update: (id: string, data: Partial<Guide>) => {
    return api.authPut<ApiResponse<Guide>>(`/guide/${id}`, data);
  },
  delete: (id: string) => {
    return api.authDelete<ApiResponse<void>>(`/guide/${id}`);
  },

  // Like operations - using your actual backend routes
  like: (guideId: string) => {
    return api.authPost<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },
  unlike: (guideId: string) => {
    return api.authDelete<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },

  // Alternative: Generic like endpoint (if you want to use the generic route)
  genericLike: (guideId: string) => {
    return api.authPost<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },
  genericUnlike: (guideId: string) => {
    return api.authDelete<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },
});

// ------------------------
// Likes API - Generic like/unlike for Questions, Guides, etc.
// ------------------------
export const likesApi = (api: ReturnType<typeof useApi>) => ({
  like: (
    contentType: 'Question' | 'GuideItem' | 'Answer' | 'Comment',
    contentId: string
  ) =>
    api.authPost<ApiResponse<LikeResponse>>(
      `/likes/${contentType}/${contentId}/like`
    ),
  unlike: (
    contentType: 'Question' | 'GuideItem' | 'Answer' | 'Comment',
    contentId: string
  ) =>
    api.authDelete<ApiResponse<LikeResponse>>(
      `/likes/${contentType}/${contentId}/like`
    ),
  checkLiked: (contentType: string, contentId: string) =>
    api.authGet<ApiResponse<{ liked: boolean; guideId?: string }>>(
      `/likes/${contentType}/${contentId}/check`
    ),
  getCount: (contentType: string, contentId: string) =>
    api.get<ApiResponse<{ count: number }>>(
      `/likes/${contentType}/${contentId}/count`
    ),
});

// ------------------------
// Map API
// ------------------------
export const mapApi = (api: ReturnType<typeof useApi>): MapApiClient => ({
  getAll: () => api.get<ApiResponse<MapLocation[]>>('/map'),
  getById: (id: string) => api.get<ApiResponse<MapLocation>>(`/map/${id}`),
  create: (data: Partial<MapLocation>) =>
    api.authPost<ApiResponse<MapLocation>>('/map', data),
  createAsAdmin: (data: Partial<MapLocation>) =>
    api.authPost<ApiResponse<MapLocation>>('/map/admin', data),
  update: (id: string, data: Partial<MapLocation>) =>
    api.authPut<ApiResponse<MapLocation>>(`/map/${id}`, data),
  delete: (id: string) =>
    api.authDelete<ApiResponse<{ id: string }>>(`/map/${id}`),
  getAllAsAdmin: () =>
    api.authGet<ApiResponse<MapLocation[]>>('/map/admin/all'),
  getByIdAsAdmin: (id: string) =>
    api.authGet<ApiResponse<MapLocation>>(`/map/admin/${id}`),
  getPending: () =>
    api.authGet<ApiResponse<MapLocation[]>>('/map/admin/pending'),
  approve: (id: string) =>
    api.authPatch<ApiResponse<MapLocation>>(`/map/${id}/approve`, {}),
  reject: (id: string) =>
    api.authPatch<ApiResponse<MapLocation>>(`/map/${id}/reject`, {}),
  investigate: (id: string) =>
    api.authPatch<ApiResponse<MapLocation>>(`/map/${id}/investigate`, {}),
});

// Profile API (secured with JWT). Profile contracts live in utils/types.ts.
export const profileApi = (api: ReturnType<typeof useApi>) => {
  const toBackendPayload = (data: UpdateProfileRequest) => {
    const { fullName, ...rest } = data;
    const payload: Record<string, any> = {
      ...rest, // includes regNumber, nin if present
      ...(fullName !== undefined ? { fullname: fullName } : {}),
    };
    Object.keys(payload).forEach(k => {
      const v = payload[k];
      if (v === '' || v === undefined || v === null) {
        delete payload[k];
      }
    });
    return payload;
  };

  // Transform API response to match our strict UserProfile type
  const transformUserProfile = (apiData: any): UserProfile => {
    if (!apiData || typeof apiData !== 'object') {
      apiData = {};
    }
    const validRoles: ('STUDENT' | 'ADMIN' | 'LECTURER')[] = [
      'STUDENT',
      'ADMIN',
      'LECTURER',
    ];
    const validSemesters: ('First' | 'Second')[] = ['First', 'Second'];
    const validStatuses: ('Cleared' | 'Pending' | 'Suspended')[] = [
      'Cleared',
      'Pending',
      'Suspended',
    ];

    const hierarchyName = (value: unknown): string => {
      if (typeof value === 'string') {
        return value;
      }
      if (
        value &&
        typeof value === 'object' &&
        'name' in value &&
        typeof value.name === 'string'
      ) {
        return value.name;
      }
      return '';
    };
    const isVerified = (value: unknown): boolean =>
      value === true ||
      (typeof value === 'string' && value.toUpperCase() === 'VERIFIED');
    const rawVerification =
      apiData.verificationStatus ?? apiData.verification_status;
    const verificationStatus = {
      email:
        typeof rawVerification === 'boolean'
          ? rawVerification
          : isVerified(rawVerification?.email ?? apiData.emailVerified),
      phone:
        typeof rawVerification === 'boolean'
          ? rawVerification
          : isVerified(rawVerification?.phone ?? apiData.phoneVerified),
      nin:
        typeof rawVerification === 'boolean'
          ? rawVerification
          : isVerified(rawVerification?.nin ?? apiData.ninVerified),
      regNumber:
        typeof rawVerification === 'boolean'
          ? rawVerification
          : isVerified(rawVerification?.regNumber ?? apiData.regNumberVerified),
    };

    return {
      id: apiData.id || '',
      email: apiData.email || '',
      fullname: apiData.fullname || apiData.fullName || '',
      role: validRoles.includes(apiData.role) ? apiData.role : 'STUDENT',
      regNumber: apiData.regNumber || '',
      department: hierarchyName(apiData.department),
      faculty: hierarchyName(apiData.faculty),
      level:
        apiData.level !== undefined &&
        apiData.level !== null &&
        Number.isFinite(Number(apiData.level))
          ? Number(apiData.level)
          : undefined,
      semester: validSemesters.includes(apiData.semester)
        ? apiData.semester
        : undefined,
      phone: apiData.phone || '',
      nin: apiData.nin || '',
      avatarUrl: apiData.avatarUrl || apiData.avatar || apiData.image || undefined,
      verificationStatus,
      status: validStatuses.includes(apiData.status)
        ? apiData.status
        : 'Pending',
      createdAt: apiData.createdAt || new Date().toISOString(),
      university: hierarchyName(apiData.university),
      programme: hierarchyName(apiData.programme),
    };
  };

  return {
    getProfile: async (): Promise<ProfileApiResponse> => {
      const response = await api.authGet<{ data: any; message?: string }>(
        '/user/profile',
        false
      );
      return {
        data: transformUserProfile(response.data),
        message: response.message,
      };
    },
    updateProfile: async (
      data: UpdateProfileRequest
    ): Promise<ProfileApiResponse> => {
      const response = await api.authPut<{ data: any; message?: string }>(
        '/user/profile',
        toBackendPayload(data)
      );
      const transformed = transformUserProfile(response.data);
      if (!transformed.programme && data.programme) {
        transformed.programme = data.programme;
      }
      return {
        data: transformed,
        message: response.message,
      };
    },
  };
};

// ------------------------
export { apiClient as api };

// Fix ApiInstance typings to match implemented signatures
export interface ApiInstance {
  get: <T>(endpoint: string, useCache?: boolean) => Promise<T>;
  post: <T>(endpoint: string, data?: any) => Promise<T>;
  put: <T>(endpoint: string, data?: any) => Promise<T>;
  patch: <T>(endpoint: string, data?: any) => Promise<T>;
  delete: <T>(endpoint: string) => Promise<T>;
  authGet: <T>(endpoint: string, useCache?: boolean) => Promise<T>;
  authPost: <T>(endpoint: string, data?: any) => Promise<T>;
  authPut: <T>(endpoint: string, data?: any) => Promise<T>;
  authPatch: <T>(endpoint: string, data?: any) => Promise<T>;
  authDelete: <T>(endpoint: string) => Promise<T>;
  clearCache: () => void;
}

export const testConnection = (): Promise<boolean> =>
  apiClient.testConnection();

export const notificationsApi = (apiInstance: ApiInstance = apiClient) => ({
  getNotifications: async (page = 1, pageSize = 20): Promise<ApiResponse<NotificationListResponse>> => {
    const res = await apiInstance.authGet<{ data: NotificationListResponse; status?: number; message?: string }>(
      `/notifications?page=${page}&pageSize=${pageSize}`,
      false
    );
    return { data: res.data, status: res.status ?? 200, message: res.message };
  },
  getUnreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const res = await apiInstance.authGet<{ data: { unreadCount: number }; status?: number; message?: string }>(
      '/notifications/unread-count',
      false
    );
    return { data: res.data, status: res.status ?? 200, message: res.message };
  },
  markAsRead: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    const res = await apiInstance.authPatch<{ data: { success: boolean }; status?: number; message?: string }>(
      `/notifications/${id}/read`
    );
    return { data: res.data, status: res.status ?? 200, message: res.message };
  },
  markAllAsRead: async (): Promise<ApiResponse<{ count: number }>> => {
    const res = await apiInstance.authPatch<{ data: { count: number }; status?: number; message?: string }>(
      '/notifications/read-all'
    );
    return { data: res.data, status: res.status ?? 200, message: res.message };
  },
});
