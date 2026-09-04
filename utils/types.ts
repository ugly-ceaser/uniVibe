import type { AuthUser } from '@/utils/authSession';

// ... existing code above stays the same ...

export interface QuestionDetail {
  id: string;
  title: string;
  body: string;
  forumId?: string;
  status: 'Open' | 'Cleared' | 'Closed' | 'Pending';
  authorId?: string;
  createdAt: string;
  category?: string;
  department?: string;
  courseCode?: string;
  viewCount?: number;
  reactionCount?: number;
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
  status?: 'Open' | 'Cleared' | 'Closed' | 'Pending';
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

export interface FieldVerificationStatus {
  email: boolean;
  phone: boolean;
  nin: boolean;
  regNumber: boolean;
}

export interface UserProfile extends AuthUser {
  id: string;
  email: string;
  fullname: string;
  role: 'STUDENT' | 'ADMIN' | 'LECTURER';
  regNumber: string;
  department: string;
  faculty: string;
  level?: number;
  semester?: 'First' | 'Second';
  phone: string;
  nin: string;
  avatarUrl?: string;
  verificationStatus: FieldVerificationStatus;
  status: 'Cleared' | 'Pending' | 'Suspended';
  createdAt: string;
  university?: string | null;
  programme?: string | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  department?: string;
  faculty?: string;
  level?: number;
  semester?: 'First' | 'Second';
  regNumber?: string; // added
  nin?: string; // added
  university?: string;
  programme?: string;
}

export interface UniversityHierarchyItem {
  id: string;
  name: string;
  shortName?: string;
  state?: string;
}

export interface FacultyHierarchyItem {
  id: string;
  name: string;
}

export interface DepartmentHierarchyItem {
  id: string;
  name: string;
}

export interface ProgrammeHierarchyItem {
  id: string;
  name: string;
  degreeType?: string;
}

export interface LevelHierarchyItem {
  id: string;
  level: number;
}

export interface SemesterHierarchyItem {
  id: string;
  name: string;
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
  category:
    | 'Lecture Hall'
    | 'Hostel'
    | 'Cafeteria'
    | 'Lab'
    | 'ATM'
    | 'Library'
    | 'Admin'
    | 'Recreation';
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
  getById: (
    id: string
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  create: (
    data: Partial<MapLocation>
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  createAsAdmin: (
    data: Partial<MapLocation>
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  update: (
    id: string,
    data: Partial<MapLocation>
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  delete: (
    id: string
  ) => Promise<import('@/types/api').ApiResponse<{ id: string }>>;
  getAllAsAdmin: () => Promise<
    import('@/types/api').ApiResponse<MapLocation[]>
  >;
  getByIdAsAdmin: (
    id: string
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  getPending: () => Promise<import('@/types/api').ApiResponse<MapLocation[]>>;
  approve: (
    id: string
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  reject: (
    id: string
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
  investigate: (
    id: string
  ) => Promise<import('@/types/api').ApiResponse<MapLocation>>;
}

// ... existing code below stays the same ...
