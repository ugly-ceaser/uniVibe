import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiResponse, Guide } from '@/types/api';
import { Category, LikeResponse } from '@/types';
import { PaginationMeta, QuestionSummary } from './types';

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
class ApiClient {
  private baseURL: string;
  private token?: string;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimestamps = new Map<string, number>();
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly MIN_REQUEST_INTERVAL = 100;
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.baseURL =
      process.env.EXPO_PUBLIC_API_URL ||
      'https://univibesbackend.onrender.com/api/v1';
    console.log('🌐 API Base URL:', this.baseURL);

    // Test connection on initialization
    this.testConnection();
  }

  private async testConnection() {
    try {
      const healthURL = this.baseURL.replace('/api/v1', '/health');
      console.log('🔍 Testing connection to:', healthURL);

      const response = await fetch(healthURL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('✅ Connection test result:', {
        url: healthURL,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });
    } catch (error) {
      console.warn('⚠️ Connection test failed:', error);
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
    this.clearCache(); // Clear cache on logout
  }

  private clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
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
      console.log(`⏱️ Throttling request ${requestKey} for ${waitTime}ms`);
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

    // Check cache for GET requests
    if (method === 'GET' && useCache && this.isRequestCached(cacheKey)) {
      console.log('💾 Returning cached data for:', requestKey);
      return this.getCachedData<T>(cacheKey)!;
    }

    // If there's already a pending request for this exact endpoint, return it
    if (this.pendingRequests.has(requestKey)) {
      console.log('🔄 Deduplicating request:', requestKey);
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
      console.log('Make Request Result', result);
      this.requestTimestamps.set(requestKey, Date.now());

      // Cache GET requests
      if (method === 'GET' && useCache) {
        this.setCacheData(cacheKey, result, cacheTTL);
      }

      // Clear cache for mutations that might affect other data
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        this.invalidateRelatedCache(endpoint);
      }

      return result;
    } finally {
      // Clean up the pending request after a short delay
      setTimeout(() => {
        this.pendingRequests.delete(requestKey);
      }, 1000);
    }
  }

  private invalidateRelatedCache(endpoint: string) {
    // Invalidate related cache entries when data is modified
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      // If creating/updating questions, invalidate questions list
      if (
        endpoint.includes('/questions') &&
        key.includes('GET:/forum/questions')
      ) {
        keysToDelete.push(key);
      }
      // If creating comments, invalidate specific question cache
      if (endpoint.includes('/comments') || endpoint.includes('/answers')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      console.log('🗑️ Invalidating cache:', key);
      this.cache.delete(key);
    });
  }

  private async _makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🌐 Making API request to:', url);

    // Build headers safely so we don't force JSON for FormData
    const mergedHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!mergedHeaders['Content-Type'] && !(options.body instanceof FormData)) {
      mergedHeaders['Content-Type'] = 'application/json';
    }
    if (this.token) {
      mergedHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
      });

      console.log('📊 Response status:', response.status);

      if (response.status === 429) {
        console.warn('⚠️ Rate limit hit, backing off...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        throw new ApiError(
          'Rate limit reached. Please wait a moment and try again.',
          429
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(
          errorData?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('💥 Request failed:', error);

      // Enhanced error handling with detailed messages
      if (error instanceof ApiError) {
        throw error; // Re-throw ApiError as-is
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Network connection failed. Please check your internet connection.',
          0
        );
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new ApiError('Invalid response format from server.', 500);
      }

      // Generic error fallback
      throw new ApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500
      );
    }
  }

  // Helper methods with caching control
  async get<T>(endpoint: string, useCache: boolean = true): Promise<T> {
    console.log('Currently in the get!!!');
    const result = this.request<T>(endpoint, { method: 'GET' }, useCache);
    console.log('The GET result', result);
    return result;
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
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.token) {
      throw new ApiError('Authentication required', 401);
    }
    return this.request<T>(endpoint, options);
  }

  async authGet<T>(endpoint: string, useCache: boolean = true): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, { method: 'GET' });
  }

  async authPost<T>(endpoint: string, data?: any): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Force refresh methods (bypass cache)
  async forceRefresh<T>(endpoint: string): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, 'GET');
    this.cache.delete(cacheKey);
    return this.get<T>(endpoint, false);
  }
}

// Create a global instance of ApiClient
const apiClient = new ApiClient();

// ------------------------
// useApi hook
// ------------------------
export const useApi = () => {
  const { token, logout } = useAuth();

  React.useEffect(() => {
    if (token) apiClient.setToken(token);
    else apiClient.clearToken();
  }, [token]);

  const authenticatedRequest = React.useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        console.error('API Error Details:', {
          message: error.message,
          status: error.status,
          stack: error.stack,
          name: error.name,
        });

        if (error instanceof ApiError) {
          if (error.status === 401) {
            Alert.alert('Session Expired', 'Please log in again', [
              { text: 'OK', onPress: logout },
            ]);
          } else if (error.status === 403) {
            Alert.alert('Access Denied', "You don't have permission", [
              { text: 'OK' },
            ]);
          } else {
            Alert.alert(
              'API Error',
              `${error.message} (Status: ${error.status})`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Network Error',
            error.message || 'Unexpected error occurred',
            [{ text: 'OK' }]
          );
        }
        throw error;
      }
    },
    [logout]
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
        authenticatedRequest(() => apiClient.get<T>(endpoint, useCache)),
      authPost: <T>(endpoint: string, data?: any) =>
        authenticatedRequest(() => apiClient.post<T>(endpoint, data)),
      authPut: <T>(endpoint: string, data?: any) =>
        authenticatedRequest(() => apiClient.put<T>(endpoint, data)),
      authPatch: <T>(endpoint: string, data?: any) =>
        authenticatedRequest(() => apiClient.patch<T>(endpoint, data)),
      authDelete: <T>(endpoint: string) =>
        authenticatedRequest(() => apiClient.delete<T>(endpoint)),

      // Additional methods
      authenticatedRequest: <T>(fn: () => Promise<T>) =>
        authenticatedRequest(fn),
      forceRefresh: <T>(endpoint: string) =>
        apiClient.forceRefresh<T>(endpoint),
    }),
    [authenticatedRequest]
  );

  return api;
};

// ------------------------
// Auth API
// ------------------------
export const authApi = {
  register: (user: { name: string; email: string; password: string }) =>
    apiClient.post('/auth/register', user),
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
};

// ------------------------
// Courses API
// ------------------------
export const coursesApi = (api: ReturnType<typeof useApi>) => ({
  getAll: () => {
    console.log('🌐 Fetching courses from /api/v1/courses');
    return api.authGet<ApiResponse<any[]>>('/courses', false);
  },
  getById: (id: string) => {
    console.log(`🌐 Fetching course ${id} from /api/v1/courses/${id}`);
    return api.get<ApiResponse<any>>(`/courses/${id}`);
  },
  create: (data: any) => {
    console.log('🌐 Creating course at /api/v1/courses');
    return api.authPost<ApiResponse<any>>('/courses', data);
  },
});

// ------------------------
// Forum API - UPDATED to match your backend endpoints
// ------------------------
export interface QuestionDetail {
  id: string;
  title: string;
  body: string;
  forumId: string;
  status: 'Cleared' | 'Pending' | 'Closed';
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  forum: {
    id: string;
    name: string;
  };
  answers: Answer[];
  _count: {
    answers: number;
  };
}

export interface Answer {
  id: string;
  body: string;
  authorId: string;
  questionId: string;
  status: 'Cleared' | 'Pending' | 'Closed';
  createdAt: string;
  commentsCount?: number;
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  _count: {
    comments: number;
  };
}

export type ForumComment = {
  id: string;
  body: string;
  createdAt: string;
  author?: { fullname?: string; id?: string };
  parentId?: string | null;
  answerId: string;
};

export type ForumCommentNode = {
  id: string;
  body: string;
  createdAt?: string;
  author?: { id?: string; fullname?: string };
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
  }) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page));
    qs.set('pageSize', String(params.pageSize));
    if (params.category) qs.set('category', params.category);
    if (params.forumId) qs.set('forumId', params.forumId);

    const endpoint = `/forum/questions${qs.toString() ? `?${qs.toString()}` : ''}`;

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
  }) => {
    const endpoint = `/forum/questions`;
    return api.post(endpoint, payload);
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
    return api.delete<ApiResponse<void>>(`/forum/questions/${questionId}`);
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
    return api.delete<ApiResponse<void>>(`/forum/answers/${answerId}`);
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
    return api.delete<ApiResponse<void>>(`/forum/comments/${commentId}`);
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

    const endpoint = `/forum/questions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.forceRefresh<ApiResponse<ForumPost[]>>(endpoint);
  },

  /**
   * Clear all forum-related cache
   */
  clearCache: () => {
    // This would need to be implemented in the ApiClient
    console.log('🗑️ Clearing forum cache...');
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
    return api.post('/forum/comments', {
      body: params.body,
      answerId: params.answerId,
      ...(params.parentId ? { parentId: params.parentId } : {}),
    });
  },

  // Public: list all replies tree under an answer (top-level + nested)
  getAnswerComments: async (answerId: string) => {
    return api.get<ForumCommentNode[]>(
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
  authorId: string;
  author: {
    id: string;
    fullname: string;
    email: string;
  };
  answers: Answer[];
  tags?: string[];
  views: number;
  votes: number;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  // Additional properties for UI
  isLiked?: boolean;
  likes?: number;
  status?: 'Cleared' | 'Pending' | 'Closed';
  _count?: {
    answers: number;
  };
}

// ------------------------
// Guide API - FIXED to match backend routes
// ------------------------
export const guideApi = (api: ReturnType<typeof useApi>) => ({
  // Guide CRUD operations - Fixed endpoints to match backend
  getAll: () => {
    console.log('🌐 Fetching guides from /api/v1/guide');
    return api.authGet<ApiResponse<Guide[]>>('/guide');
  },
  getById: (id: string) => {
    console.log(`🌐 Fetching guide ${id} from /api/v1/guide/${id}`);
    return api.authGet<ApiResponse<Guide>>(`/guide/${id}`);
  },
  create: (data: Partial<Guide>) => {
    console.log('🌐 Creating guide at /api/v1/guide');
    return api.authPost<ApiResponse<Guide>>('/guide', data);
  },
  update: (id: string, data: Partial<Guide>) => {
    console.log(`🌐 Updating guide ${id} at /api/v1/guide/${id}`);
    return api.authPut<ApiResponse<Guide>>(`/guide/${id}`, data);
  },
  delete: (id: string) => {
    console.log(`🌐 Deleting guide ${id} at /api/v1/guide/${id}`);
    return api.authDelete<ApiResponse<void>>(`/guide/${id}`);
  },

  // Like operations - using your actual backend routes
  like: (guideId: string) => {
    console.log(
      `🌐 Liking guide ${guideId} at /api/v1/likes/guide/${guideId}/like`
    );
    return api.authPost<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },
  unlike: (guideId: string) => {
    console.log(
      `🌐 Unliking guide ${guideId} at /api/v1/likes/guide/${guideId}/like`
    );
    return api.authDelete<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },

  // Alternative: Generic like endpoint (if you want to use the generic route)
  genericLike: (guideId: string) => {
    console.log(`🌐 Generic like guide ${guideId}`);
    return api.authPost<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },
  genericUnlike: (guideId: string) => {
    console.log(`🌐 Generic unlike guide ${guideId}`);
    return api.authDelete<ApiResponse<LikeResponse>>(
      `/likes/guide/${guideId}/like`
    );
  },
});

// ------------------------
// Map API
// ------------------------
export const mapApi = (api: ReturnType<typeof useApi>) => ({
  getAll: () => api.get('/map'),
  getById: (id: string) => api.get(`/map/${id}`),
  create: (data: {
    name: string;
    coordinates: any;
    description?: string;
    category?: string;
  }) => api.authPost('/map', data),
  createAsAdmin: (data: { name: string; coordinates: any; status: string }) =>
    api.authPost('/map/admin', data),
  update: (id: string, data: { name?: string; coordinates?: any }) =>
    api.authPut(`/map/${id}`, data),
  delete: (id: string) => api.authDelete(`/map/${id}`),
  getAllAsAdmin: () => api.authGet('/map/admin/all'),
  getByIdAsAdmin: (id: string) => api.authGet(`/map/admin/${id}`),
  getPending: () => api.authGet('/map/admin/pending'),
  approve: (id: string) => api.authPatch(`/map/${id}/approve`, {}),
  reject: (id: string) => api.authPatch(`/map/${id}/reject`, {}),
  investigate: (id: string) => api.authPatch(`/map/${id}/investigate`, {}),
});

// ------------------------
// Profile API (secured with JWT)
// ------------------------
export interface Profile {
  id: string;
  fullname: string;
  email: string;
  phone?: string;
  department?: string;
  faculty?: string;
  level?: number;
  semester?: string;
}

export interface UserProfile extends Profile {
  regNumber?: string;
  nin?: string;
  role?: string;
  avatarUrl?: string;
  verificationStatus?: boolean;
  status?: string;
  createdAt?: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  department?: string;
  faculty?: string;
  level?: number;
  semester?: 'First' | 'Second' | string;
}

export interface VerifyFieldsRequest {
  email?: boolean;
  phone?: boolean;
  nin?: boolean;
  regNumber?: boolean;
}

export interface ProfileApiResponse {
  data: UserProfile;
  message?: string;
}

export const profileApi = (api: ReturnType<typeof useApi>) => {
  const toBackendPayload = (data: UpdateProfileRequest) => {
    const { fullName, ...rest } = data;
    const payload: Record<string, any> = {
      ...rest, // includes regNumber, nin if present
      ...(fullName !== undefined ? { fullname: fullName } : {}),
    };
    Object.keys(payload).forEach(k => {
      const v = payload[k];
      if (v === '' || v === undefined || v === null) delete payload[k];
    });
    return payload;
  };

  return {
    getProfile: () => api.authGet<ProfileApiResponse>('/user/profile', false),
    updateProfile: (data: UpdateProfileRequest) =>
      api.authPut<ProfileApiResponse>('/user/profile', toBackendPayload(data)),
    verifyFields: (data: VerifyFieldsRequest) =>
      api.authPatch<ProfileApiResponse>('/user/profile/verify', data),
    uploadAvatar: (formData: FormData) =>
      api.authPost<{ data: { avatarUrl: string } }>(
        '/user/profile/avatar',
        formData
      ),
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
}

const logRequest = async (endpoint: string, options?: any) => {
  console.log(`API Request: ${endpoint}`, {
    options,
    timestamp: new Date().toISOString(),
  });
};

export const testConnection = async (): Promise<boolean> => {
  const baseURL = process.env.EXPO_PUBLIC_API_URL || '';

  try {
    // Extract the base server URL (without /api/v1)
    const serverURL = baseURL.replace('/api/v1', '');
    const healthURL = `${serverURL}/health`;

    console.log('Testing local connection to:', healthURL);

    const response = await fetch(healthURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Connection test result:', {
      url: healthURL,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });

    return response.ok;
  } catch (error) {
    console.error('Local connection failed:', error);
    return false;
  }
};

// Add these API helper functions

export const mapApiClient = (apiClient: ApiClient) => ({
  getAll: (): Promise<ApiResponse<Location[]>> => {
    return apiClient.request<ApiResponse<Location[]>>('/map');
  },
  getById: (id: string): Promise<ApiResponse<Location>> => {
    return apiClient.request<ApiResponse<Location>>(`/map/${id}`);
  },
  create: (locationData: Partial<Location>): Promise<ApiResponse<Location>> => {
    return apiClient.request<ApiResponse<Location>>('/map', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  },
});
