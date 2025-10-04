// ... existing code above stays the same ...

export interface QuestionDetail {
  id: string;
  title: string;
  body: string;
  forumId: string;
  status: 'Open' | 'Cleared' | 'Closed';
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
  status: 'Open' | 'Cleared' | 'Closed';
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

export interface UserProfile {
  id: string;
  email: string;
  fullname: string;
  role: 'STUDENT' | 'ADMIN' | 'LECTURER';
  regNumber: string;
  department: string;
  faculty: string;
  level: number;
  semester: 'First' | 'Second';
  phone: string;
  nin: string;
  avatarUrl?: string;
  verificationStatus: boolean;
  status: 'Cleared' | 'Pending' | 'Suspended';
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  department?: string;
  faculty?: string;
  level?: number;
  semester?: 'First' | 'Second';
  regNumber?: string; // added
  nin?: string;       // added
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

export interface Category {
  id: string;
  name: string;
  slug?: string;
  createdAt?: string;
}

export interface QuestionSummary {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  forum: { id: string; name: string };
  author: { fullname: string };
  _count: { answers: number };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

// Map and location types
export interface MapLocation {
  id: string;
  name: string;
  description?: string;
  category: 'Lecture Hall' | 'Hostel' | 'Cafeteria' | 'Lab' | 'ATM' | 'Library' | 'Admin' | 'Recreation';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status?: 'active' | 'pending' | 'rejected' | 'investigating';
  googleMapsUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Map API client interface
export interface MapApiClient {
  getAll: () => Promise<import('@/types/api').ApiResponse<MapLocation[]>>;
  getById: (id: string) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  create: (data: Partial<MapLocation>) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  createAsAdmin: (data: Partial<MapLocation>) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  update: (id: string, data: Partial<MapLocation>) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  delete: (id: string) => Promise<import('@/types/api').ApiResponse<{ id: string }>>;
  getAllAsAdmin: () => Promise<import('@/types/api').ApiResponse<MapLocation[]>>;
  getByIdAsAdmin: (id: string) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  getPending: () => Promise<import('@/types/api').ApiResponse<MapLocation[]>>;
  approve: (id: string) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  reject: (id: string) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  investigate: (id: string) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
}

// ... existing code below stays the same ...