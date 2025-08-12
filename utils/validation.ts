import { User, ChatMessage, SurvivalTip, Course, ForumPost } from '@/types';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const isValidPassword = (
  password: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Username validation
export const isValidUsername = (
  username: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 20) {
    errors.push('Username must be less than 20 characters long');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// User validation
export const validateUser = (
  user: Partial<User>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (user.email && !isValidEmail(user.email)) {
    errors.push('Invalid email format');
  }

  if (user.username && !isValidUsername(user.username).isValid) {
    errors.push(...isValidUsername(user.username).errors);
  }

  if (user.firstName && user.firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters long');
  }

  if (user.lastName && user.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters long');
  }

  if (user.year && (user.year < 1 || user.year > 10)) {
    errors.push('Year must be between 1 and 10');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Chat message validation
export const validateChatMessage = (
  message: Partial<ChatMessage>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!message.text || message.text.trim().length === 0) {
    errors.push('Message text is required');
  }

  if (message.text && message.text.length > 1000) {
    errors.push('Message text must be less than 1000 characters');
  }

  if (message.isUser === undefined) {
    errors.push('Message type (user/AI) must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Survival tip validation
export const validateSurvivalTip = (
  tip: Partial<SurvivalTip>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!tip.title || tip.title.trim().length === 0) {
    errors.push('Tip title is required');
  }

  if (tip.title && tip.title.length > 100) {
    errors.push('Tip title must be less than 100 characters');
  }

  if (!tip.description || tip.description.trim().length === 0) {
    errors.push('Tip description is required');
  }

  if (tip.description && tip.description.length > 500) {
    errors.push('Tip description must be less than 500 characters');
  }

  if (!tip.content || tip.content.trim().length === 0) {
    errors.push('Tip content is required');
  }

  if (!tip.category) {
    errors.push('Tip category is required');
  }

  if (
    tip.category &&
    !['Academics', 'Social Life', 'Budgeting', 'Safety'].includes(tip.category)
  ) {
    errors.push('Invalid tip category');
  }

  if (tip.tags && tip.tags.length > 10) {
    errors.push('Tip cannot have more than 10 tags');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Course validation
export const validateCourse = (
  course: Partial<Course>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!course.code || course.code.trim().length === 0) {
    errors.push('Course code is required');
  }

  if (!course.name || course.name.trim().length === 0) {
    errors.push('Course name is required');
  }

  if (course.credits && (course.credits < 1 || course.credits > 30)) {
    errors.push('Course credits must be between 1 and 30');
  }

  if (!course.instructor || course.instructor.trim().length === 0) {
    errors.push('Course instructor is required');
  }

  if (course.year && (course.year < 2020 || course.year > 2030)) {
    errors.push('Course year must be between 2020 and 2030');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Forum post validation
export const validateForumPost = (
  post: Partial<ForumPost>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!post.title || post.title.trim().length === 0) {
    errors.push('Post title is required');
  }

  if (post.title && post.title.length > 200) {
    errors.push('Post title must be less than 200 characters');
  }

  if (!post.content || post.content.trim().length === 0) {
    errors.push('Post content is required');
  }

  if (post.content && post.content.length > 10000) {
    errors.push('Post content must be less than 10000 characters');
  }

  if (!post.category) {
    errors.push('Post category is required');
  }

  if (
    post.category &&
    ![
      'General',
      'Academics',
      'Social',
      'Housing',
      'Transport',
      'Events',
    ].includes(post.category)
  ) {
    errors.push('Invalid post category');
  }

  if (post.tags && post.tags.length > 15) {
    errors.push('Post cannot have more than 15 tags');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Generic required field validation
export const isRequired = (
  value: any,
  fieldName: string
): { isValid: boolean; error?: string } => {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  return { isValid: true };
};

// String length validation
export const validateStringLength = (
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): { isValid: boolean; error?: string } => {
  if (value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters long`,
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be less than ${maxLength} characters long`,
    };
  }

  return { isValid: true };
};

// Number range validation
export const validateNumberRange = (
  value: number,
  fieldName: string,
  min: number,
  max: number
): { isValid: boolean; error?: string } => {
  if (value < min || value > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return { isValid: true };
};
