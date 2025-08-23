import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiResponse } from '@/types/api';
import { ForumPost } from '@/types';

// ------------------------
// Base setup
// ------------------------
const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ;

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: { page: number; limit: number; total: number; totalPages: number };
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

const getDefaultHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorMessage = STATUS_MESSAGES[response.status] || 'Unexpected error';
    let requestId: string | undefined;
    try {
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        requestId = errorData.requestId;
      }
    } catch {}
    throw new ApiError(errorMessage, response.status, requestId);
  }
  if (contentType?.includes('application/json')) return response.json();
  return response.text() as unknown as T;
};

// ------------------------
// ApiClient
// ------------------------
class ApiClient {
  private baseURL: string;
  private token?: string;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimestamps = new Map<string, number>();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly MIN_REQUEST_INTERVAL = 100;
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || '';
    console.log('API Base URL:', this.baseURL);
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

  private setCacheData(cacheKey: string, data: any, ttl: number = this.DEFAULT_CACHE_TTL) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
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
      if (endpoint.includes('/questions') && key.includes('GET:/forum/questions')) {
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

  private async _makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('🌐 Making API request to:', url);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          ...options.headers,
        },
      });

      console.log('📊 Response status:', response.status);
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limit hit, backing off...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        throw new ApiError('Rate limit reached. Please wait a moment and try again.', 429);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('💥 Request failed:', error);
      throw error;
    }
  }

  // Helper methods with caching control
  async get<T>(endpoint: string, useCache: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, useCache);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, false); // Never cache POST requests
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, false);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, false);
  }

  // Authenticated requests
  async authenticatedRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  const authenticatedRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) Alert.alert('Session Expired', 'Please log in again', [{ text: 'OK', onPress: logout }]);
        else if (error.status === 403) Alert.alert('Access Denied', "You don't have permission", [{ text: 'OK' }]);
        else Alert.alert('Error', error.message, [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', 'Unexpected error occurred', [{ text: 'OK' }]);
      }
      throw error;
    }
  };

  return {
    // Public
    get: <T>(endpoint: string, options?: RequestInit) => apiClient.get<T>(endpoint, options),
    post: <T>(endpoint: string, data?: any, options?: RequestInit) => apiClient.post<T>(endpoint, data, options),

    // Auth
    authGet: <T>(endpoint: string, options?: RequestInit) => authenticatedRequest(() => apiClient.get<T>(endpoint, options)),
    authPost: <T>(endpoint: string, data?: any, options?: RequestInit) => authenticatedRequest(() => apiClient.post<T>(endpoint, data, options)),
    authPut: <T>(endpoint: string, data?: any, options?: RequestInit) => authenticatedRequest(() => apiClient.put<T>(endpoint, data, options)),
    authPatch: <T>(endpoint: string, data?: any, options?: RequestInit) => authenticatedRequest(() => apiClient.patch<T>(endpoint, data, options)),
    authDelete: <T>(endpoint: string, options?: RequestInit) => authenticatedRequest(() => apiClient.delete<T>(endpoint, options)),
  };
};

// ------------------------
// Auth API
// ------------------------
export const authApi = {
  register: (user: { name: string; fullname:string; email: string; password: string }) => apiClient.post('/auth/register', user),
  login: (credentials: { email: string; password: string }) => apiClient.post('/auth/login', credentials),
};

// ------------------------
// Courses API
// ------------------------
export const coursesApi = (api: ReturnType<typeof useApi>) => ({
  getAll: () => api.get('/courses'),
  getById: (id: string) => api.get(`/courses/${id}`),
  create: (data: any) => api.authPost('/courses', data),
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

export const forumApi = (api: ReturnType<typeof useApi>) => ({
  // ===== QUESTIONS =====
  
  /**
   * GET /api/v1/forum/questions - List All Questions
   * Supports pagination and filtering
   */
  getQuestions: (params?: { 
    page?: number; 
    pageSize?: number; 
    forumId?: string;
    refresh?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.forumId) queryParams.append('forumId', params.forumId);
    
    const endpoint = `/forum/questions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return api.get<{
      data: {
        questions: ForumPost[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
      }
    }>(endpoint, !params?.refresh);
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
  createQuestion: (data: { 
    title: string; 
    body: string; 
    forumId?: string;
    tags?: string[];
  }) => {
    return api.authPost<ApiResponse<ForumPost>>('/forum/questions', data);
  },

  /**
   * PUT /api/v1/forum/questions/:id - Update Question (if supported)
   */
  updateQuestion: (questionId: string, data: { 
    title?: string; 
    body?: string; 
    tags?: string[];
  }) => {
    return api.authenticatedRequest<ApiResponse<ForumPost>>(`/forum/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
  addAnswer: (questionId: string, data: { 
    body: string;
    isAnonymous?: boolean;
  }) => {
    return api.authPost<ApiResponse<Answer>>(`/forum/questions/${questionId}/answers`, data);
  },

  /**
   * PUT /api/v1/forum/answers/:id - Update Answer (if supported)
   */
  updateAnswer: (answerId: string, data: { body: string }) => {
    return api.authenticatedRequest<ApiResponse<Answer>>(`/forum/answers/${answerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
    return api.authPost<ApiResponse<{ score: number }>>(`/forum/answers/${answerId}/vote`, { vote });
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
    return api.authenticatedRequest<ApiResponse<Comment>>(`/forum/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
    if (params.tags) params.tags.forEach(tag => queryParams.append('tags', tag));
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    
    const endpoint = `/forum/search?${queryParams.toString()}`;
    return api.get<ApiResponse<ForumPost[]>>(endpoint, false); // Don't cache search results
  },

  // ===== UTILITY METHODS =====

  /**
   * Force refresh specific question and clear related cache
   */
  refreshQuestion: async (questionId: string) => {
    return api.forceRefresh<{ data: QuestionDetail }>(`/forum/questions/${questionId}`);
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
}

// ------------------------
// Guide API - FIXED to match backend routes
// ------------------------
export const guideApi = (api: ReturnType<typeof useApi>) => ({
  // Guide CRUD operations
  getAll: () => api.get<ApiResponse<Guide[]>>('/guide'),
  getById: (id: string) => api.get<ApiResponse<Guide>>(`/guide/${id}`),
  create: (data: Partial<Guide>) => api.authPost<ApiResponse<Guide>>('/guide', data),
  update: (id: string, data: Partial<Guide>) => api.authPut<ApiResponse<Guide>>(`/guide/${id}`, data),
  delete: (id: string) => api.authDelete<ApiResponse<void>>(`/guide/${id}`),

  // Like operations - using your actual backend routes
  like: (guideId: string) => api.authPost<ApiResponse<LikeResponse>>(`/likes/guide/${guideId}/like`),
  unlike: (guideId: string) => api.authDelete<ApiResponse<LikeResponse>>(`/likes/guide/${guideId}/like`),
  
  // Alternative: Generic like endpoint (if you want to use the generic route)
  genericLike: (guideId: string) => api.authPost<ApiResponse<LikeResponse>>(`/likes/guide/${guideId}/like`),
  genericUnlike: (guideId: string) => api.authDelete<ApiResponse<LikeResponse>>(`/likes/guide/${guideId}/like`),
});

// ------------------------
// Map API
// ------------------------
export const mapApi = (api: ReturnType<typeof useApi>) => ({
  getAll: () => api.get('/map'),
  getById: (id: string) => api.get(`/map/${id}`),
  create: (data: { name: string; coordinates: any; description?: string; category?: string }) => api.authPost('/map', data),
  createAsAdmin: (data: { name: string; coordinates: any; status: string }) => api.authPost('/map/admin', data),
  update: (id: string, data: { name?: string; coordinates?: any }) => api.authPut(`/map/${id}`, data),
  delete: (id: string) => api.authDelete(`/map/${id}`),
  getAllAsAdmin: () => api.authGet('/map/admin/all'),
  getByIdAsAdmin: (id: string) => api.authGet(`/map/admin/${id}`),
  getPending: () => api.authGet('/map/admin/pending'),
  approve: (id: string) => api.authPatch(`/map/${id}/approve`, {}),
  reject: (id: string) => api.authPatch(`/map/${id}/reject`, {}),
  investigate: (id: string) => api.authPatch(`/map/${id}/investigate`, {}),
});

// ------------------------
// Profile API
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

export const profileApi = (api: ReturnType<typeof useApi>) => ({
  // Get current user's profile
  getProfile: () => {
    return api.get<ProfileApiResponse>('/user/profile');
  },

  // Update user profile
  updateProfile: (data: UpdateProfileRequest) => {
    return api.put<ProfileApiResponse>('/user/profile', data);
  },

  // Verify profile fields
  verifyFields: (data: VerifyFieldsRequest) => {
    return api.patch<ProfileApiResponse>('/user/profile/verify', data);
  },

  // Upload avatar (if needed)
  uploadAvatar: (formData: FormData) => {
    return api.post<{ data: { avatarUrl: string } }>('/user/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
});

// ------------------------
export { apiClient as api };

export interface ApiInstance {
  get: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  patch: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  delete: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
  authGet: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
  authPost: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  authPut: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  authPatch: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  authDelete: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
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
      statusText: response.statusText
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

// Example usage in Map Screen:
// import { useApi, mapApiClient } from '@/utils/api';
// 
// export default function MapScreen() {
//   const api = useApi();
//   const apiClient = React.useMemo(() => mapApiClient(api), [api]);
// 
//   const fetchLocations = React.useCallback(async (isRefresh = false) => {
//     // ...existing logic...
//     const response = await apiClient.getAll();
//     // ...rest
//   }, [apiClient, hasAttempted, loading, refreshing]);
// }

// Example usage in Forum Screen:
// import { useApi, forumApi } from '@/utils/api';
// 
// export default function ForumScreen() {
//   const api = useApi();
//   const apiClient = React.useMemo(() => forumApi(api), [api]);
// 
//   const fetchPosts = React.useCallback(async (isRefresh = false) => {
//     // ...existing logic...
//     const response = await apiClient.getQuestions();
//     // ...rest
//   }, [apiClient, hasAttempted, loading, refreshing]);
// }
