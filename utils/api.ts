import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

// API Base URL
const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] || 'https://univibesbackend.onrender.com/api/v1';

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
  requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Error Types
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

// HTTP Status Code Messages
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request - Please check your input',
  401: 'Unauthorized - Please log in again',
  403: "Forbidden - You don't have permission for this action",
  404: 'Not Found - The requested resource was not found',
  409: 'Conflict - This resource already exists',
  422: 'Validation Error - Please check your input',
  429: 'Too Many Requests - Please try again later',
  500: 'Internal Server Error - Please try again later',
  502: 'Bad Gateway - Service temporarily unavailable',
  503: 'Service Unavailable - Please try again later',
};

// Get default headers
const getDefaultHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Handle API response
const handleResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  
  // Log API response for development
  console.log('🌐 API Response:', {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    timestamp: new Date().toISOString(),
  });

  if (!response.ok) {
    let errorMessage = STATUS_MESSAGES[response.status] || 'An unexpected error occurred';
    let requestId: string | undefined;

    try {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.log('❌ API Error Data:', errorData);
        errorMessage = errorData.message || errorMessage;
        requestId = errorData.requestId;
      }
    } catch {
      // If we can't parse the error response, use the default message
      console.log('⚠️ Could not parse error response');
    }

    throw new ApiError(errorMessage, response.status, requestId);
  }

  if (contentType && contentType.includes('application/json')) {
    const jsonData = await response.json();
    console.log('✅ API Success Data:', jsonData);
    return jsonData;
  }

  const textData = await response.text();
  console.log('✅ API Text Response:', textData);
  return textData as T;
};

// Base API client
class ApiClient {
  private baseURL: string;
  private token?: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = getDefaultHeaders(this.token);

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    // Log API request for development
    console.log('🚀 API Request:', {
      method: config.method || 'GET',
      url,
      headers: config.headers,
      body: config.body,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await fetch(url, config);
      return await handleResponse<T>(response);
    } catch (error) {
      console.log('💥 API Request Failed:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    }
  }

  // GET request
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST request
  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const body = data ? JSON.stringify(data) : null;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const body = data ? JSON.stringify(data) : null;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  // PATCH request
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const body = data ? JSON.stringify(data) : null;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Hook for using API client with authentication
export const useApi = () => {
  const { token, logout } = useAuth();

  // Set token when it changes
  React.useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    } else {
      apiClient.clearToken();
    }
  }, [token]);

  // Enhanced API methods with authentication error handling
  const authenticatedRequest = async <T>(
    requestFn: () => Promise<T>
  ): Promise<T> => {
    try {
      return await requestFn();
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle authentication errors
        if (error.status === 401) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [
              {
                text: 'OK',
                onPress: () => logout(),
              },
            ]
          );
        } else if (error.status === 403) {
          Alert.alert(
            'Access Denied',
            "You don't have permission to perform this action.",
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', error.message, [{ text: 'OK' }]);
        }
      } else {
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      }
      throw error;
    }
  };

  return {
    // Public endpoints (no authentication required)
    get: <T>(endpoint: string, options?: RequestInit) =>
      apiClient.get<T>(endpoint, options),

    post: <T>(endpoint: string, data?: any, options?: RequestInit) =>
      apiClient.post<T>(endpoint, data, options),

    // Authenticated endpoints
    authGet: <T>(endpoint: string, options?: RequestInit) =>
      authenticatedRequest(() => apiClient.get<T>(endpoint, options)),

    authPost: <T>(endpoint: string, data?: any, options?: RequestInit) =>
      authenticatedRequest(() => apiClient.post<T>(endpoint, data, options)),

    authPut: <T>(endpoint: string, data?: any, options?: RequestInit) =>
      authenticatedRequest(() => apiClient.put<T>(endpoint, data, options)),

    authPatch: <T>(endpoint: string, data?: any, options?: RequestInit) =>
      authenticatedRequest(() => apiClient.patch<T>(endpoint, data, options)),

    authDelete: <T>(endpoint: string, options?: RequestInit) =>
      authenticatedRequest(() => apiClient.delete<T>(endpoint, options)),
  };
};

// Export the API client for direct use
export { apiClient as api };

// Auth API functions
export const authApi = {
  register: async (userData: { name: string; email: string; password: string }) => {
    return apiClient.post('/auth/register', userData);
  },

  login: async (credentials: { email: string; password: string }) => {
    return apiClient.post('/auth/login', credentials);
  },
};

// Courses API functions
export const coursesApi = {
  getAll: () => apiClient.get('/courses'),
  getById: (id: string) => apiClient.get(`/courses/${id}`),
  create: (courseData: any) => apiClient.post('/courses', courseData),
};

// Forum API functions
export const forumApi = {
  getQuestions: () => apiClient.get('/forum/questions'),
  createQuestion: (questionData: { title: string; body: string; tags?: string[] }) =>
    apiClient.post('/forum/questions', questionData),
  addAnswer: (questionId: string, answerData: { body: string }) =>
    apiClient.post(`/forum/questions/${questionId}/answers`, answerData),
  getComments: (answerId: string) => apiClient.get(`/forum/answers/${answerId}/comments`),
  addComment: (commentData: { answerId: string; text: string }) =>
    apiClient.post('/forum/comments', commentData),
  createForum: (forumData: { name: string; description: string }) =>
    apiClient.post('/forum/forums', forumData),
};

// Guide API functions
export const guideApi = {
  getAll: () => apiClient.get('/guide'),
  getById: (id: string) => apiClient.get(`/guide/${id}`),
  getLikesCount: (id: string) => apiClient.get(`/guide/${id}/likes/count`),
  create: (guideData: { title: string; content: string }) =>
    apiClient.post('/guide', guideData),
  update: (id: string, guideData: { title?: string; content?: string }) =>
    apiClient.put(`/guide/${id}`, guideData),
  delete: (id: string) => apiClient.delete(`/guide/${id}`),
  like: (id: string) => apiClient.post(`/guide/${id}/like`),
  unlike: (id: string) => apiClient.delete(`/guide/${id}/like`),
};

// Map API functions
export const mapApi = {
  getAll: () => apiClient.get('/map'),
  getById: (id: string) => apiClient.get(`/map/${id}`),
  create: (locationData: { name: string; coordinates: any }) =>
    apiClient.post('/map', locationData),
  createAsAdmin: (locationData: { name: string; coordinates: any; status: string }) =>
    apiClient.post('/map/admin', locationData),
  update: (id: string, locationData: { name?: string; coordinates?: any }) =>
    apiClient.put(`/map/${id}`, locationData),
  delete: (id: string) => apiClient.delete(`/map/${id}`),
  getAllAsAdmin: () => apiClient.get('/map/admin/all'),
  getByIdAsAdmin: (id: string) => apiClient.get(`/map/admin/${id}`),
  getPending: () => apiClient.get('/map/admin/pending'),
  approve: (id: string) => apiClient.patch(`/map/${id}/approve`),
  reject: (id: string) => apiClient.patch(`/map/${id}/reject`),
  investigate: (id: string) => apiClient.patch(`/map/${id}/investigate`),
};