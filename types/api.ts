import { Guide } from './guide';
import { Profile, ProfileUpdateData } from './profile';

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

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface GuideResponse extends ApiResponse<Guide> {
  // Add any guide-specific response fields here
}

export const profileApi = (api: ApiInstance) => ({
  updateProfile: (data: ProfileUpdateData): Promise<ApiResponse<Profile>> => {
    return api.authPut('/profile', data);
  }
});

export type { Guide };
