/**
 * AI Chat Utility Helper
 * Provides convenient functions for working with the AI API
 */

import {
  useApi,
  aiApi,
  AIChatRequest,
  GeneralChatRequest,
  AcademicChatRequest,
} from '@/utils/api';

export type UserMode = 'fast' | 'balanced' | 'smart';

export interface AIUtilityConfig {
  defaultUserMode?: UserMode;
  maxRetries?: number;
  timeoutMs?: number;
}

export class AIUtility {
  private api: ReturnType<typeof useApi>;
  private config: Required<AIUtilityConfig>;

  constructor(api: ReturnType<typeof useApi>, config: AIUtilityConfig = {}) {
    this.api = api;
    this.config = {
      defaultUserMode: config.defaultUserMode || 'balanced',
      maxRetries: config.maxRetries || 3,
      timeoutMs: config.timeoutMs || 30000,
    };
  }

  /**
   * Send a course-specific AI chat message
   */
  async askCourseQuestion(
    message: string,
    courseContext: {
      courseId: string;
      courseCode: string;
      courseName: string;
      outline?: string[];
      assessment?: Array<{ type: string; percentage: number }>;
      instructor?: string;
      description?: string;
    },
    options?: {
      conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
      userMode?: UserMode;
    }
  ) {
    const request: AIChatRequest = {
      message,
      courseId: courseContext.courseId,
      context: courseContext,
      conversationHistory: options?.conversationHistory || [],
      userMode: options?.userMode || this.config.defaultUserMode,
    };

    return this.withRetry(() => aiApi(this.api).courseChat(request));
  }

  /**
   * Send a general AI chat message
   */
  async askGeneralQuestion(
    message: string,
    options?: {
      conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
      userMode?: UserMode;
    }
  ) {
    const request: GeneralChatRequest = {
      message,
      conversationHistory: options?.conversationHistory || [],
      userMode: options?.userMode || this.config.defaultUserMode,
    };

    return this.withRetry(() => aiApi(this.api).generalChat(request));
  }

  /**
   * Send an academic progress question
   */
  async askAcademicQuestion(
    message: string,
    studentContext: {
      studentId: string;
      currentGPA?: number;
      enrolledCourses?: string[];
      completedCourses?: string[];
      strugglingSubjects?: string[];
      studyHours?: number;
      activeForumPosts?: number;
    },
    options?: {
      conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
      userMode?: UserMode;
    }
  ) {
    const request: AcademicChatRequest = {
      message,
      studentContext,
      conversationHistory: options?.conversationHistory || [],
      userMode: options?.userMode || 'smart', // Default to smart for academic analysis
    };

    return this.withRetry(() => aiApi(this.api).academicChat(request));
  }

  /**
   * Get course insights with caching
   */
  async getCourseInsights(courseId: string, useCache: boolean = true) {
    if (useCache) {
      return this.withRetry(() => aiApi(this.api).getCourseInsights(courseId));
    }

    // Force refresh by making the request without cache
    return this.withRetry(() =>
      this.api.forceRefresh(`/ai/insights/course/${courseId}`)
    );
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    courseId: string,
    studentData?: {
      completedTopics?: string[];
      strugglingAreas?: string[];
      studyHours?: number;
      lastAssignmentScore?: number;
      attendanceRate?: number;
      forumParticipation?: string;
    }
  ) {
    return this.withRetry(() =>
      aiApi(this.api).getPersonalizedRecommendations(courseId, studentData)
    );
  }

  /**
   * Get all chat sessions for the user
   */
  async getChatSessions() {
    return this.withRetry(() => aiApi(this.api).getChatSessions());
  }

  /**
   * Get a specific chat session
   */
  async getChatSession(sessionId: string) {
    return this.withRetry(() => aiApi(this.api).getChatSession(sessionId));
  }

  /**
   * Delete a chat session
   */
  async deleteChatSession(sessionId: string) {
    return this.withRetry(() => aiApi(this.api).deleteChatSession(sessionId));
  }

  /**
   * Estimate cost for a message based on user mode
   */
  estimateMessageCost(
    message: string,
    userMode: UserMode = 'balanced'
  ): number {
    const approxTokens = Math.ceil(message.length / 4); // Rough estimate: 4 chars per token

    const costPerToken = {
      fast: 0.0000005, // gpt-3.5-turbo
      balanced: 0.00000015, // gpt-4o-mini
      smart: 0.0000025, // gpt-4o
    };

    return approxTokens * costPerToken[userMode];
  }

  /**
   * Get recommended user mode based on message complexity and user preference
   */
  getRecommendedUserMode(
    message: string,
    context: 'course' | 'general' | 'academic',
    userPreference?: UserMode
  ): UserMode {
    if (userPreference) return userPreference;

    // Academic analysis defaults to smart
    if (context === 'academic') return 'smart';

    // Complex questions (long messages, technical terms) use balanced
    if (
      message.length > 200 ||
      /\b(algorithm|complex|analysis|detailed|explain)\b/i.test(message)
    ) {
      return 'balanced';
    }

    // Simple questions use fast
    return 'fast';
  }

  /**
   * Helper to convert chat messages from UI format to API format
   */
  convertMessagesToHistory(
    messages: Array<{ text: string; isUser: boolean }>
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map(msg => ({
      role: msg.isUser ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    }));
  }

  /**
   * Retry wrapper for API calls
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Request timeout')),
              this.config.timeoutMs
            )
          ),
        ]);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof Error &&
          (error.message.includes('401') || // Unauthorized
            error.message.includes('403') || // Forbidden
            error.message.includes('400')) // Bad Request
        ) {
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

/**
 * React hook for AI utilities
 */
export function useAIUtility(config?: AIUtilityConfig) {
  const api = useApi();
  return new AIUtility(api, config);
}

/**
 * Quick helpers for common use cases
 */
export const AIHelpers = {
  /**
   * Quick course question
   */
  askCourse: async (
    api: ReturnType<typeof useApi>,
    message: string,
    courseId: string,
    courseName: string,
    courseCode: string
  ) => {
    const utility = new AIUtility(api);
    return utility.askCourseQuestion(message, {
      courseId,
      courseCode,
      courseName,
    });
  },

  /**
   * Quick general question
   */
  askGeneral: async (
    api: ReturnType<typeof useApi>,
    message: string,
    userMode: UserMode = 'balanced'
  ) => {
    const utility = new AIUtility(api);
    return utility.askGeneralQuestion(message, { userMode });
  },

  /**
   * Quick academic analysis
   */
  analyzeAcademic: async (
    api: ReturnType<typeof useApi>,
    studentId: string,
    message: string = 'Analyze my academic performance',
    context?: {
      currentGPA?: number;
      enrolledCourses?: string[];
      strugglingSubjects?: string[];
    }
  ) => {
    const utility = new AIUtility(api);
    return utility.askAcademicQuestion(message, {
      studentId,
      ...context,
    });
  },
};

export default AIUtility;
