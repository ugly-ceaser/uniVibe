# Backend Requirements for AI Chat Conversation Storage & Retrieval

## 📋 **Overview**

This document outlines the complete backend requirements for implementing organized, persistent AI chat conversations that can be saved and retrieved efficiently. The system should maintain conversation history, support course-specific sessions, and provide fast retrieval mechanisms.

## 🗄️ **Database Schema Requirements**

### **1. Core Tables**

#### **`ai_chat_sessions` Table**

```sql
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id VARCHAR(50), -- Optional, NULL for general chats
  session_type ENUM('course', 'general', 'academic', 'campus') NOT NULL DEFAULT 'general',
  title VARCHAR(255) NOT NULL,
  status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
  metadata JSONB, -- Store additional context (course info, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- Indexes for fast retrieval
  INDEX idx_student_course (student_id, course_id),
  INDEX idx_student_type (student_id, session_type),
  INDEX idx_last_message (last_message_at DESC),
  INDEX idx_created_at (created_at DESC),

  -- Constraints
  CONSTRAINT unique_student_course_active
    UNIQUE (student_id, course_id, session_type)
    WHERE status = 'active' AND course_id IS NOT NULL
);
```

#### **`ai_chat_messages` Table**

```sql
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  content_type ENUM('text', 'markdown', 'json') DEFAULT 'text',
  metadata JSONB, -- Store confidence, sources, tokens, cost, etc.
  sequence_number INTEGER NOT NULL, -- For ordering within session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for fast retrieval
  INDEX idx_session_sequence (session_id, sequence_number),
  INDEX idx_session_created (session_id, created_at),
  INDEX idx_role_session (session_id, role),

  -- Constraints
  CONSTRAINT unique_session_sequence UNIQUE (session_id, sequence_number)
);
```

#### **`courses` Table (if not exists)**

```sql
CREATE TABLE courses (
  id VARCHAR(50) PRIMARY KEY, -- e.g., 'CS101'
  code VARCHAR(20) NOT NULL UNIQUE, -- e.g., 'CS101'
  name VARCHAR(255) NOT NULL, -- e.g., 'Introduction to Programming'
  description TEXT,
  instructor VARCHAR(255),
  outline JSONB, -- Array of topics
  assessment JSONB, -- Assessment breakdown
  status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  INDEX idx_code (code),
  INDEX idx_status (status)
);
```

#### **`users` Table (reference)**

```sql
-- Assuming this exists, required fields:
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  fullname VARCHAR(255),
  -- ... other user fields
);
```

### **2. Supporting Tables**

#### **`ai_chat_analytics` Table**

```sql
CREATE TABLE ai_chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
  tokens_used INTEGER,
  model_used VARCHAR(50),
  response_time_ms INTEGER,
  cost_usd DECIMAL(10, 8),
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  INDEX idx_session_analytics (session_id),
  INDEX idx_model_usage (model_used, created_at),
  INDEX idx_cost_tracking (created_at, cost_usd)
);
```

## 🔌 **API Endpoints Implementation**

### **1. Session Management Endpoints**

#### **GET /api/v1/ai/courses/{courseId}/chats**

```typescript
// Get all chat sessions for a specific course
interface CourseChatsResponse {
  course: {
    id: string;
    code: string;
    name: string;
    description?: string;
  };
  chatSessions: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    messageCount: number;
    lastMessage?: {
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    };
  }[];
  totalSessions: number;
}

// Implementation Logic:
async function getCourseChatSessions(courseId: string, userId: string) {
  // 1. Get course info
  const course = await db.courses.findUnique({ where: { id: courseId } });

  // 2. Get all sessions for this course and user
  const sessions = await db.ai_chat_sessions.findMany({
    where: {
      student_id: userId,
      course_id: courseId,
      status: 'active',
    },
    include: {
      _count: { select: { ai_chat_messages: true } },
      ai_chat_messages: {
        orderBy: { created_at: 'desc' },
        take: 1, // Get last message
      },
    },
    orderBy: { last_message_at: 'desc' },
  });

  return {
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      description: course.description,
    },
    chatSessions: sessions.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      lastMessageAt: session.last_message_at,
      messageCount: session._count.ai_chat_messages,
      lastMessage: session.ai_chat_messages[0]
        ? {
            role: session.ai_chat_messages[0].role,
            content: session.ai_chat_messages[0].content,
            createdAt: session.ai_chat_messages[0].created_at,
          }
        : undefined,
    })),
    totalSessions: sessions.length,
  };
}
```

#### **GET /api/v1/ai/courses/{courseId}/chats/session**

```typescript
// Get or create active session for a course
interface ActiveSessionResponse {
  id: string;
  courseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
    metadata?: any;
  }[];
  messageCount: number;
}

// Implementation Logic:
async function getCourseActiveSession(courseId: string, userId: string) {
  // 1. Try to find existing active session
  let session = await db.ai_chat_sessions.findFirst({
    where: {
      student_id: userId,
      course_id: courseId,
      session_type: 'course',
      status: 'active',
    },
    include: {
      ai_chat_messages: {
        orderBy: { sequence_number: 'asc' },
      },
    },
  });

  // 2. If no session exists, create one
  if (!session) {
    const course = await db.courses.findUnique({ where: { id: courseId } });

    session = await db.ai_chat_sessions.create({
      data: {
        student_id: userId,
        course_id: courseId,
        session_type: 'course',
        title: `${course.code} Chat Session`,
        metadata: {
          courseCode: course.code,
          courseName: course.name,
          outline: course.outline,
          assessment: course.assessment,
          instructor: course.instructor,
        },
      },
      include: {
        ai_chat_messages: {
          orderBy: { sequence_number: 'asc' },
        },
      },
    });
  }

  return {
    id: session.id,
    courseId: session.course_id,
    title: session.title,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messages: session.ai_chat_messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.created_at,
      metadata: msg.metadata,
    })),
    messageCount: session.ai_chat_messages.length,
  };
}
```

#### **POST /api/v1/ai/chat/course (Enhanced)**

```typescript
// Enhanced course chat with automatic session management
interface EnhancedCourseRequest {
  message: string;
  courseId: string;
  sessionId?: string; // Optional explicit session
  context: CourseContext;
  userMode?: 'fast' | 'balanced' | 'smart';
  useSession?: boolean; // Flag to enable session storage
}

// Implementation Logic:
async function enhancedCourseChat(
  request: EnhancedCourseRequest,
  userId: string
) {
  let session;

  // 1. Get or create session
  if (request.useSession) {
    if (request.sessionId) {
      // Use specific session
      session = await db.ai_chat_sessions.findUnique({
        where: { id: request.sessionId },
        include: { ai_chat_messages: { orderBy: { sequence_number: 'asc' } } },
      });
    } else {
      // Get or create active session for course
      session = await getCourseActiveSession(request.courseId, userId);
    }
  }

  // 2. Get conversation history from session or request
  const conversationHistory = session
    ? session.ai_chat_messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))
    : request.conversationHistory || [];

  // 3. Save user message to session
  let userMessage;
  if (session) {
    const nextSequence = await getNextSequenceNumber(session.id);
    userMessage = await db.ai_chat_messages.create({
      data: {
        session_id: session.id,
        role: 'user',
        content: request.message,
        sequence_number: nextSequence,
        metadata: { userMode: request.userMode },
      },
    });
  }

  // 4. Call AI service
  const aiResponse = await callAIService({
    message: request.message,
    context: request.context,
    conversationHistory,
    userMode: request.userMode,
  });

  // 5. Save AI response to session
  if (session) {
    const nextSequence = await getNextSequenceNumber(session.id);
    await db.ai_chat_messages.create({
      data: {
        session_id: session.id,
        role: 'assistant',
        content: aiResponse.response,
        sequence_number: nextSequence,
        metadata: {
          confidence: aiResponse.confidence,
          sources: aiResponse.sources,
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          cost: aiResponse.estimatedCost,
        },
      },
    });

    // Update session last_message_at
    await db.ai_chat_sessions.update({
      where: { id: session.id },
      data: {
        last_message_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  // 6. Track analytics
  if (session && userMessage) {
    await db.ai_chat_analytics.create({
      data: {
        session_id: session.id,
        message_id: userMessage.id,
        tokens_used: aiResponse.tokensUsed,
        model_used: aiResponse.model,
        response_time_ms: aiResponse.responseTime,
        cost_usd: aiResponse.estimatedCost,
        confidence_score: aiResponse.confidence,
      },
    });
  }

  return {
    ...aiResponse,
    sessionId: session?.id,
  };
}
```

### **2. Additional Utility Endpoints**

#### **GET /api/v1/ai/sessions/{sessionId}**

```typescript
// Get specific session with all messages
async function getSessionById(sessionId: string, userId: string) {
  const session = await db.ai_chat_sessions.findFirst({
    where: {
      id: sessionId,
      student_id: userId,
      status: 'active',
    },
    include: {
      ai_chat_messages: {
        orderBy: { sequence_number: 'asc' },
      },
      course: true, // If course-specific
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  return {
    id: session.id,
    title: session.title,
    sessionType: session.session_type,
    course: session.course,
    messages: session.ai_chat_messages,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}
```

#### **DELETE /api/v1/ai/sessions/{sessionId}**

```typescript
// Archive/delete a session
async function deleteSession(sessionId: string, userId: string) {
  // Soft delete by marking as deleted
  await db.ai_chat_sessions.updateMany({
    where: {
      id: sessionId,
      student_id: userId,
    },
    data: {
      status: 'deleted',
      updated_at: new Date(),
    },
  });

  return { success: true };
}
```

#### **GET /api/v1/ai/sessions**

```typescript
// Get all sessions for a user
async function getAllUserSessions(
  userId: string,
  options?: {
    sessionType?: string;
    limit?: number;
    offset?: number;
  }
) {
  const sessions = await db.ai_chat_sessions.findMany({
    where: {
      student_id: userId,
      status: 'active',
      ...(options?.sessionType && { session_type: options.sessionType }),
    },
    include: {
      _count: { select: { ai_chat_messages: true } },
      course: true,
      ai_chat_messages: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
    orderBy: { last_message_at: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });

  return sessions;
}
```

## 🔧 **Helper Functions**

### **Sequence Number Management**

```typescript
async function getNextSequenceNumber(sessionId: string): Promise<number> {
  const lastMessage = await db.ai_chat_messages.findFirst({
    where: { session_id: sessionId },
    orderBy: { sequence_number: 'desc' },
    select: { sequence_number: true },
  });

  return (lastMessage?.sequence_number || 0) + 1;
}
```

### **Session Title Generation**

```typescript
function generateSessionTitle(
  firstMessage: string,
  courseCode?: string
): string {
  const truncated =
    firstMessage.length > 50
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;

  const prefix = courseCode ? `${courseCode}: ` : '';
  return `${prefix}${truncated}`;
}
```

### **Analytics Tracking**

```typescript
async function trackChatAnalytics(data: {
  sessionId: string;
  messageId: string;
  tokensUsed: number;
  model: string;
  responseTime: number;
  cost: number;
  confidence: number;
}) {
  await db.ai_chat_analytics.create({
    data: {
      session_id: data.sessionId,
      message_id: data.messageId,
      tokens_used: data.tokensUsed,
      model_used: data.model,
      response_time_ms: data.responseTime,
      cost_usd: data.cost,
      confidence_score: data.confidence,
    },
  });
}
```

## 🚀 **Performance Optimizations**

### **1. Database Indexing Strategy**

```sql
-- Compound indexes for common queries
CREATE INDEX idx_user_course_sessions ON ai_chat_sessions(student_id, course_id, status, last_message_at DESC);
CREATE INDEX idx_session_messages_ordered ON ai_chat_messages(session_id, sequence_number);
CREATE INDEX idx_recent_sessions ON ai_chat_sessions(student_id, status, last_message_at DESC);

-- Partial indexes for active sessions only
CREATE INDEX idx_active_sessions ON ai_chat_sessions(student_id, last_message_at DESC)
WHERE status = 'active';
```

### **2. Caching Strategy**

```typescript
// Redis caching for frequently accessed sessions
const CACHE_TTL = 300; // 5 minutes

async function getCachedSession(sessionId: string) {
  const cached = await redis.get(`session:${sessionId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  const session = await getSessionFromDB(sessionId);
  await redis.setex(`session:${sessionId}`, CACHE_TTL, JSON.stringify(session));

  return session;
}
```

### **3. Pagination**

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'created_at' | 'last_message_at';
  sortOrder?: 'asc' | 'desc';
}

async function getPaginatedSessions(
  userId: string,
  options: PaginationOptions
) {
  const offset = (options.page - 1) * options.limit;

  const [sessions, totalCount] = await Promise.all([
    db.ai_chat_sessions.findMany({
      where: { student_id: userId, status: 'active' },
      orderBy: {
        [options.sortBy || 'last_message_at']: options.sortOrder || 'desc',
      },
      take: options.limit,
      skip: offset,
      include: {
        _count: { select: { ai_chat_messages: true } },
      },
    }),
    db.ai_chat_sessions.count({
      where: { student_id: userId, status: 'active' },
    }),
  ]);

  return {
    sessions,
    pagination: {
      page: options.page,
      limit: options.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / options.limit),
    },
  };
}
```

## 🔒 **Security & Access Control**

### **1. User Authorization**

```typescript
// Middleware to ensure user can only access their own sessions
async function validateSessionAccess(sessionId: string, userId: string) {
  const session = await db.ai_chat_sessions.findUnique({
    where: { id: sessionId },
    select: { student_id: true },
  });

  if (!session || session.student_id !== userId) {
    throw new Error('Access denied');
  }
}
```

### **2. Data Validation**

```typescript
// Input validation schemas
const CreateSessionSchema = {
  courseId: { type: 'string', required: false },
  sessionType: {
    type: 'string',
    enum: ['course', 'general', 'academic', 'campus'],
  },
  title: { type: 'string', maxLength: 255 },
};

const MessageSchema = {
  content: { type: 'string', maxLength: 5000, required: true },
  role: {
    type: 'string',
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
};
```

## 📊 **Monitoring & Analytics**

### **1. Usage Metrics**

```sql
-- Daily chat usage by course
SELECT
  course_id,
  DATE(created_at) as chat_date,
  COUNT(*) as message_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM ai_chat_messages
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY course_id, DATE(created_at)
ORDER BY chat_date DESC;

-- Most active courses
SELECT
  c.code,
  c.name,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(m.id) as total_messages,
  AVG(m.metadata->>'confidence') as avg_confidence
FROM courses c
JOIN ai_chat_sessions s ON c.id = s.course_id
JOIN ai_chat_messages m ON s.id = m.session_id
WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.code, c.name
ORDER BY total_messages DESC;
```

### **2. Cost Tracking**

```sql
-- Monthly cost analysis
SELECT
  DATE_TRUNC('month', created_at) as month,
  model_used,
  SUM(cost_usd) as total_cost,
  SUM(tokens_used) as total_tokens,
  COUNT(*) as total_requests
FROM ai_chat_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at), model_used
ORDER BY month DESC, total_cost DESC;
```

## 🔄 **Data Maintenance**

### **1. Cleanup Jobs**

```typescript
// Archive old sessions (run monthly)
async function archiveOldSessions() {
  const cutoffDate = new Date();
  cutoffDate.setMonths(cutoffDate.getMonths() - 6);

  await db.ai_chat_sessions.updateMany({
    where: {
      last_message_at: { lt: cutoffDate },
      status: 'active',
    },
    data: {
      status: 'archived',
      updated_at: new Date(),
    },
  });
}

// Delete very old archived sessions (run annually)
async function deleteOldArchivedSessions() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

  await db.ai_chat_sessions.deleteMany({
    where: {
      updated_at: { lt: cutoffDate },
      status: 'archived',
    },
  });
}
```

### **2. Data Export**

```typescript
// Export user chat data (GDPR compliance)
async function exportUserChatData(userId: string) {
  const sessions = await db.ai_chat_sessions.findMany({
    where: { student_id: userId },
    include: {
      ai_chat_messages: {
        orderBy: { sequence_number: 'asc' },
      },
      course: true,
    },
  });

  return {
    user_id: userId,
    export_date: new Date().toISOString(),
    total_sessions: sessions.length,
    sessions: sessions.map(session => ({
      id: session.id,
      title: session.title,
      course: session.course,
      created_at: session.created_at,
      messages: session.ai_chat_messages,
    })),
  };
}
```

This comprehensive backend specification ensures that AI chat conversations are properly stored, organized, and retrievable with optimal performance and security! 🚀
