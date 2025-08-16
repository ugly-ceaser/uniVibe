// Navigation Types
export interface RootStackParamList {
  index: undefined;
  onboarding: undefined;
  login: undefined;
  register: undefined;
  profile: undefined;
  '(tabs)': undefined;
  'tip-detail': { tipId: string };
  'post-detail': { postId: string };
  'course-detail': { courseId: string };
  '+not-found': undefined;
}

export interface TabParamList {
  index: undefined;
  courses: undefined;
  forum: undefined;
  map: undefined;
  profile: undefined;
}

// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  university: string;
  course: string;
  year: number;
  createdAt: Date;
  lastActive: Date;
}

// Chat Types
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  metadata?: {
    category?: string;
    helpful?: boolean;
    feedback?: string;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  startedAt: Date;
  lastActivity: Date;
  category?: string;
}

// Survival Tip Types
export interface SurvivalTip {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'Academics' | 'Social Life' | 'Budgeting' | 'Safety';
  readTime: string;
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  helpfulCount: number;
  bookmarkCount: number;
}

// Course Types
export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  instructor: string;
  schedule: CourseSchedule[];
  syllabus: string;
  assignments: Assignment[];
  resources: CourseResource[];
  semester: string;
  year: number;
}

export interface CourseSchedule {
  day:
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';
  startTime: string;
  endTime: string;
  room: string;
  building: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  weight: number;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  submittedAt?: Date;
  grade?: number;
}

export interface CourseResource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'book';
  url: string;
  description: string;
  uploadedAt: Date;
}

// Forum Types
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: User;
  category:
    | 'General'
    | 'Academics'
    | 'Social'
    | 'Housing'
    | 'Transport'
    | 'Events';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  replies: number;
  isPinned: boolean;
  isLocked: boolean;
  lastReplyAt?: Date;
}

export interface ForumReply {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentReplyId?: string;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  isEdited: boolean;
}

// Campus Location Types
export interface CampusLocation {
  id: string;
  name: string;
  type: 'building' | 'facility' | 'landmark' | 'parking' | 'dining' | 'library';
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: string;
  hours?: string;
  contact?: string;
  amenities: string[];
  images: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    body: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
  };
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export * from './guide';
export * from './api';
