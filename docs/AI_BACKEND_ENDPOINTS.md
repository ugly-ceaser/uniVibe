# AI Chat Backend Endpoints Documentation

## Overview

This document outlines the backend API endpoints required for the uniVibe AI chat feature. The AI chat system supports multiple contexts: course-specific assistance, general university guidance, academic progress tracking, and campus life support.

## Base Configuration

- **Base URL**: `https://univibesbackend.onrender.com/api/v1`
- **Authentication**: JWT Bearer token required for all endpoints
- **Content-Type**: `application/json`
- **Rate Limiting**: Recommended 30 requests per minute per user

## Core AI Chat Endpoints

### 1. Course-Specific AI Chat

**Endpoint:** `POST /ai/chat/course`

**Purpose:** Provides AI assistance tailored to specific course content, outline, and assessments.

**Request Headers:**

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "message": "Show me the course outline",
  "courseId": "CS101",
  "context": {
    "courseCode": "CS101",
    "courseName": "Introduction to Programming",
    "outline": [
      "Variables and Data Types",
      "Functions and Loops",
      "Object-Oriented Programming",
      "Data Structures",
      "Algorithms and Problem Solving"
    ],
    "assessment": [
      { "type": "Assignment", "percentage": 30 },
      { "type": "Midterm Exam", "percentage": 35 },
      { "type": "Final Exam", "percentage": 35 }
    ],
    "instructor": "Dr. Smith",
    "description": "Foundational programming course covering basic to intermediate concepts"
  },
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help with CS101?" }
  ]
}
```

**Response Schema:**

```json
{
  "data": {
    "response": "Here's the course outline for CS101: Introduction to Programming...",
    "confidence": 0.95,
    "sources": ["course_syllabus.pdf", "instructor_notes.md"],
    "suggestions": [
      "Would you like study tips for any specific topic?",
      "Need help understanding the assessment breakdown?",
      "Want to know more about the instructor's teaching style?"
    ]
  },
  "message": "AI response generated successfully",
  "timestamp": "2025-10-04T10:30:00Z"
}
```

**Error Responses:**

```json
{
  "error": "Course not found",
  "message": "The specified courseId does not exist",
  "status": 404
}
```

### 2. General AI Chat

**Endpoint:** `POST /ai/chat/general`

**Purpose:** Provides broad AI assistance for general university life questions and guidance.

**Request Headers:**

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "message": "How can I improve my study habits?",
  "conversationHistory": [
    { "role": "user", "content": "I'm struggling with time management" },
    {
      "role": "assistant",
      "content": "Time management is crucial for academic success..."
    }
  ]
}
```

**Response Schema:**

```json
{
  "data": {
    "response": "Here are some effective study strategies for university students: 1. Create a structured study schedule...",
    "confidence": 0.88,
    "sources": ["study_guides.pdf", "academic_resources.md"],
    "suggestions": [
      "Would you like time management tips?",
      "Need help with specific subjects?",
      "Want to learn about study groups?"
    ]
  },
  "message": "AI response generated successfully",
  "timestamp": "2025-10-04T10:30:00Z"
}
```

### 3. Academic Progress AI Chat

**Endpoint:** `POST /ai/chat/academic`

**Purpose:** Provides personalized academic performance analysis and recommendations.

**Request Headers:**

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "message": "How is my academic performance this semester?",
  "studentContext": {
    "studentId": "12345",
    "currentGPA": 3.2,
    "enrolledCourses": ["CS101", "MATH201", "ENG102"],
    "completedCourses": ["CS100", "MATH101"],
    "strugglingSubjects": ["Calculus", "Data Structures"],
    "studyHours": 15,
    "activeForumPosts": 8
  },
  "conversationHistory": []
}
```

**Response Schema:**

```json
{
  "data": {
    "response": "Based on your current GPA of 3.2 and study patterns, here's my analysis...",
    "confidence": 0.92,
    "sources": ["academic_performance_data", "study_analytics"],
    "suggestions": [
      "Focus more time on struggling subjects",
      "Consider forming study groups",
      "Utilize office hours for difficult topics"
    ]
  },
  "message": "Academic analysis completed",
  "timestamp": "2025-10-04T10:30:00Z"
}
```

## Supporting AI Endpoints

### 4. Course Insights

**Endpoint:** `GET /ai/insights/course/{courseId}`

**Purpose:** Get AI-generated study plans and course-specific insights.

**Request Headers:**

```http
Authorization: Bearer <jwt_token>
```

**Response Schema:**

```json
{
  "data": {
    "studyPlan": [
      "Week 1-2: Master variables and basic syntax",
      "Week 3-4: Practice functions and control structures",
      "Week 5-6: Dive into object-oriented concepts"
    ],
    "keyTopics": [
      "Variables and Data Types",
      "Functions and Methods",
      "Loops and Conditionals",
      "Object-Oriented Programming"
    ],
    "assessmentTips": [
      "Start assignments early to avoid last-minute rush",
      "Review past exam questions for pattern recognition",
      "Practice coding problems daily for 30 minutes"
    ],
    "resources": [
      "textbook_chapters_1-5.pdf",
      "practice_problems_set1.md",
      "video_tutorials_basics.mp4"
    ],
    "difficultyRating": "Intermediate",
    "estimatedStudyHours": 8
  },
  "message": "Course insights generated successfully"
}
```

### 5. Personalized Recommendations

**Endpoint:** `POST /ai/recommendations/course/{courseId}`

**Purpose:** Generate personalized study recommendations based on student progress.

**Request Headers:**

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "studentData": {
    "completedTopics": ["Variables", "Functions", "Basic Loops"],
    "strugglingAreas": ["Nested Loops", "Arrays", "Object Methods"],
    "studyHours": 15,
    "lastAssignmentScore": 75,
    "attendanceRate": 0.85,
    "forumParticipation": "moderate"
  }
}
```

**Response Schema:**

```json
{
  "data": {
    "recommendations": [
      "Spend extra 2 hours weekly on nested loops practice",
      "Join study group for object-oriented programming",
      "Complete additional practice problems for arrays"
    ],
    "focusAreas": [
      "Nested control structures",
      "Array manipulation",
      "Object method implementation"
    ],
    "timeAllocation": {
      "nested_loops": 3,
      "arrays": 4,
      "object_methods": 3,
      "review": 2
    },
    "nextSteps": [
      "Complete practice set #3 by next week",
      "Attend Thursday's review session",
      "Schedule office hours with instructor"
    ]
  },
  "message": "Personalized recommendations generated"
}
```

## Implementation Requirements

### Authentication & Security

1. **JWT Token Validation**

   - Verify token signature and expiration
   - Extract user ID and role from token
   - Rate limit per authenticated user

2. **Input Validation**

   - Sanitize all input messages
   - Validate conversation history format
   - Limit message length (max 500 characters)
   - Limit conversation history (max 20 messages)

3. **Data Privacy**
   - Don't log sensitive student information
   - Encrypt conversation history in transit
   - Implement data retention policies

### AI Service Integration

1. **Context Processing**

   - Parse course context for relevant information
   - Maintain conversation state across requests
   - Generate context-aware responses

2. **Response Quality**

   - Include confidence scores (0.0 - 1.0)
   - Provide source attribution when possible
   - Generate relevant follow-up suggestions

3. **Fallback Handling**
   - Graceful degradation when AI service unavailable
   - Default responses for common queries
   - Error logging for debugging

### Performance & Reliability

1. **Response Time**

   - Target response time: < 3 seconds
   - Implement timeout handling (30 seconds max)
   - Cache common responses where appropriate

2. **Error Handling**

   - Comprehensive error responses
   - Retry logic for transient failures
   - Graceful handling of AI service downtime

3. **Monitoring**
   - Track response times and success rates
   - Monitor AI service health
   - Log conversation analytics (anonymized)

## Error Response Format

All endpoints should return consistent error responses:

```json
{
  "error": "ValidationError",
  "message": "Message content exceeds maximum length",
  "details": {
    "field": "message",
    "maxLength": 500,
    "actualLength": 750
  },
  "status": 400,
  "timestamp": "2025-10-04T10:30:00Z"
}
```

### Common Error Codes

- `400` - Bad Request (validation errors, malformed requests)
- `401` - Unauthorized (missing or invalid JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (course or resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (AI service errors, database issues)
- `503` - Service Unavailable (AI service temporarily down)

## Testing Considerations

### Unit Tests

- Test input validation and sanitization
- Test conversation history parsing
- Test error handling scenarios

### Integration Tests

- Test AI service integration
- Test database interactions
- Test authentication flow

### Load Tests

- Test concurrent user scenarios
- Test rate limiting effectiveness
- Test system performance under load

## Deployment Notes

1. **Environment Variables**

   ```bash
   AI_SERVICE_URL=https://ai-service.provider.com/v1
   AI_SERVICE_API_KEY=your_api_key_here
   JWT_SECRET=your_jwt_secret
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=30
   ```

2. **Health Checks**

   - Implement `/health` endpoint
   - Check AI service connectivity
   - Monitor database connection

3. **Logging**
   - Log all API requests (excluding sensitive data)
   - Log AI service interactions
   - Implement structured logging for analytics

## Frontend Integration Notes

## Frontend Integration Status

### ✅ **Updated Components & Utilities**

1. **`utils/api.ts`** - Updated with new endpoint specifications:

   - Added `GeneralChatRequest`, `AcademicChatRequest` interfaces
   - Updated `AIChatResponse` with new fields (cached, model, tokensUsed, estimatedCost)
   - Added session management endpoints
   - Added chat session types and interfaces

2. **`components/UnifiedAIChat.tsx`** - Updated to use new API format:

   - Uses proper request objects with `userMode` parameter
   - Supports academic progress context with `studentContext`
   - Handles new response format with confidence and suggestions

3. **`utils/aiUtility.ts`** - New utility class for easier AI integration:

   - Convenient wrapper methods for all AI endpoints
   - Built-in retry logic and error handling
   - Cost estimation and user mode recommendations
   - React hook for easy component integration

4. **`scripts/test-ai-api.js`** - Test script for backend validation:
   - Complete test suite for all AI endpoints
   - Error handling validation
   - User mode testing
   - Easy token configuration

### 🔧 **Usage Examples**

**Simple Integration:**

```typescript
import { useAIUtility } from '@/utils/aiUtility';

function MyComponent() {
  const aiUtility = useAIUtility();

  const handleCourseQuestion = async () => {
    const response = await aiUtility.askCourseQuestion(
      'Explain the course outline',
      {
        courseId: 'CS101',
        courseCode: 'CS101',
        courseName: 'Programming Basics',
      }
    );
    console.log(response.data.response);
  };
}
```

**Advanced Integration with Context:**

```typescript
import { AIHelpers, useApi } from '@/utils/api';

function AcademicDashboard() {
  const api = useApi();

  const analyzePerformance = async () => {
    const result = await AIHelpers.analyzeAcademic(
      api,
      'user123',
      'How can I improve my grades?',
      {
        currentGPA: 3.2,
        strugglingSubjects: ['Math', 'Physics'],
      }
    );
  };
}
```

### 📋 **Backend Integration Checklist**

- [ ] Implement `/ai/chat/course` endpoint
- [ ] Implement `/ai/chat/general` endpoint
- [ ] Implement `/ai/chat/academic` endpoint
- [ ] Implement `/ai/insights/course/{id}` endpoint
- [ ] Implement `/ai/recommendations/course/{id}` endpoint
- [ ] Implement session management endpoints
- [ ] Set up JWT authentication validation
- [ ] Configure rate limiting (30 req/min)
- [ ] Add input validation (500 char limit)
- [ ] Test with provided test script

The frontend is fully prepared for the new backend specification. Components now rely entirely on the backend API and will show appropriate error messages when the AI service is unavailable.
