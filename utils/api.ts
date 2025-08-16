import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

// ------------------------
// Base setup
// ------------------------
const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] || 'http://localhost:3000/api/v1';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
  requestId: string;
}

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
  private token: string | undefined;

  constructor(baseURL: string) { this.baseURL = baseURL; }

  setToken(token: string) { this.token = token; }
  clearToken() { this.token = undefined; }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = getDefaultHeaders(this.token);
    const config: RequestInit = { ...options, headers: { ...headers, ...options.headers } };
    try {
      const response = await fetch(url, config);
      return await handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
    }
  }

  get<T>(endpoint: string, options?: RequestInit) { return this.request<T>(endpoint, { ...options, method: 'GET' }); }
  post<T>(endpoint: string, data?: any, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : null });
  }
  put<T>(endpoint: string, data?: any, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : null });
  }
  patch<T>(endpoint: string, data?: any, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : null });
  }
  delete<T>(endpoint: string, options?: RequestInit) { return this.request<T>(endpoint, { ...options, method: 'DELETE' }); }
}

const apiClient = new ApiClient(API_BASE_URL);

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
// Forum API
// ------------------------
export const forumApi = (api: ReturnType<typeof useApi>) => ({
  getQuestions: () => api.get('/forum/questions'),
  createQuestion: (data: { title: string; body: string; tags?: string[] }) => api.authPost('/forum/questions', data),
  addAnswer: (questionId: string, data: { body: string }) => api.authPost(`/forum/questions/${questionId}/answers`, data),
  getComments: (answerId: string) => api.get(`/forum/answers/${answerId}/comments`),
  addComment: (data: { answerId: string; text: string }) => api.authPost('/forum/comments', data),
  createForum: (data: { name: string; description: string }) => api.authPost('/forum/forums', data),
});

// ------------------------
// Guide API
// ------------------------
import { Guide, GuidesResponse, LikeResponse } from '@/types/guide';

export const guideApi = (api: ApiInstance) => ({
  getAll: () => api.get<ApiResponse<GuidesResponse>>('/guides'),
  getById: (id: string) => api.get<ApiResponse<Guide>>(`/guides/${id}`),
  like: (id: string) => api.authPost<ApiResponse<LikeResponse>>(`/guides/${id}/like`),
});

// ------------------------
// Map API
// ------------------------
export const mapApi = (api: ReturnType<typeof useApi>) => ({
  getAll: () => api.get('/map'),
  getById: (id: string) => api.get(`/map/${id}`),
  create: (data: { name: string; coordinates: any }) => api.authPost('/map', data),
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
export const profileApi = (api: ApiInstance) => ({
  getProfile: () => api.authGet('/profile'),
  updateProfile: (data: { 
    fullname?: string; 
    phone?: string; 
    department?: string; 
    faculty?: string; 
    level?: number; 
    semester?: string 
  }) => api.authPut('/profile', data),
  verifyField: (data: { 
    email?: boolean; 
    phone?: boolean; 
    nin?: boolean; 
    regNumber?: boolean 
  }) => api.authPatch('/profile/verify', data),
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
