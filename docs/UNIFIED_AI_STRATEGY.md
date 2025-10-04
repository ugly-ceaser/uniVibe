# 🤖 Unified AI Chat System - Implementation Guide

## 🎯 **Strategy: Context-Aware AI with Specialized Behaviors**

The unified approach maintains two distinct AI personalities while sharing common infrastructure:

### 1. **Course-Specific AI** (Limited Scope)
- **Focus**: Course outline, syllabus, assignments, assessments
- **Context**: Specific course data (outline, assessment breakdown, instructor)
- **Behavior**: Strict boundaries - only discusses course-related content
- **Location**: Course detail pages

### 2. **Broader University AI** (Comprehensive Scope)
- **Focus**: Academic progress, campus life, study strategies, general guidance
- **Context**: Student profile, academic history, campus resources
- **Behavior**: Holistic university experience support
- **Location**: Global floating button across the app

## 📱 **Implementation Examples**

### Course Detail Page (Course-Specific AI)
```tsx
// In app/course-detail.tsx
import UnifiedAIChat from '@/components/UnifiedAIChat';

<UnifiedAIChat
  contextType="course"
  courseContext={{
    courseId: courseId as string,
    courseCode: course.code,
    courseName: course.name,
    outline: course.outline,
    assessment: course.assessment,
    instructor: course.instructor,
    description: course.description
  }}
  buttonPosition="floating"
  buttonSize="medium"
  onMessageSent={(message, context) => {
    // Track course-specific AI usage
    analytics.track('course_ai_interaction', {
      courseId: courseId,
      messageType: 'course_outline_query',
      context: context
    });
  }}
/>
```

### Global App Pages (Broader University AI)
```tsx
// In app/_layout.tsx or any main page
import UnifiedAIChat from '@/components/UnifiedAIChat';

<UnifiedAIChat
  contextType="academic-progress"
  studentContext={{
    studentId: user.id,
    enrolledCourses: user.enrolledCourses,
    currentGPA: user.gpa,
    studyHours: user.weeklyStudyHours,
    strugglingSubjects: user.strugglingSubjects
  }}
  buttonPosition="floating"
  buttonSize="medium"
  onMessageSent={(message, context) => {
    // Track broader AI usage
    analytics.track('general_ai_interaction', {
      studentId: user.id,
      contextType: context,
      messageCategory: categorizeMessage(message.text)
    });
  }}
/>
```

### Campus Life AI (Additional Context)
```tsx
// In app/(tabs)/map.tsx or campus-related pages
<UnifiedAIChat
  contextType="campus-life"
  buttonPosition="floating"
  buttonSize="small"
  onMessageSent={(message, context) => {
    analytics.track('campus_life_ai', {
      location: 'map_page',
      queryType: 'campus_navigation'
    });
  }}
/>
```

## 🔧 **Backend API Structure**

### Enhanced AI Endpoints
```typescript
// In utils/api.ts - Enhanced AI API
export const aiApi = (api: ReturnType<typeof useApi>) => ({
  // Course-specific AI (restricted to course content)
  courseChat: (data: {
    message: string;
    courseId: string;
    context: CourseContext;
    conversationHistory?: ConversationHistory[];
  }) => {
    return api.authPost<AIChatResponse>('/ai/chat/course', {
      ...data,
      scope: 'course_outline_only', // Backend enforces scope
      restrictions: [
        'course_content_only',
        'no_personal_advice',
        'syllabus_focused'
      ]
    });
  },

  // Academic progress AI (student performance focused)
  academicProgressChat: (data: {
    message: string;
    studentContext: StudentContext;
    conversationHistory?: ConversationHistory[];
  }) => {
    return api.authPost<AIChatResponse>('/ai/chat/academic', {
      ...data,
      scope: 'academic_performance',
      capabilities: [
        'gpa_analysis',
        'study_recommendations',
        'time_management',
        'course_planning'
      ]
    });
  },

  // General university AI (comprehensive support)
  generalUniversityChat: (data: {
    message: string;
    studentContext?: StudentContext;
    conversationHistory?: ConversationHistory[];
  }) => {
    return api.authPost<AIChatResponse>('/ai/chat/general', {
      ...data,
      scope: 'university_life',
      capabilities: [
        'campus_life',
        'academic_guidance', 
        'resource_discovery',
        'social_support'
      ]
    });
  }
});
```

## 🎨 **Visual Differentiation**

### Context-Specific Button Appearances
```tsx
// Course AI - Purple gradient, Book icon
contextType: 'course' → colors: ['#667eea', '#764ba2'], icon: BookOpen

// Academic Progress AI - Pink gradient, Chart icon  
contextType: 'academic-progress' → colors: ['#f093fb', '#f5576c'], icon: BarChart

// Campus Life AI - Blue gradient, User icon
contextType: 'campus-life' → colors: ['#4facfe', '#00f2fe'], icon: User

// General AI - Default purple, Chat icon
contextType: 'general' → colors: ['#667eea', '#764ba2'], icon: MessageCircle
```

## 🛡️ **AI Behavior Boundaries**

### Course AI Restrictions (Backend Implementation)
```python
class CourseAIHandler:
    def __init__(self, course_context):
        self.allowed_topics = [
            'course_outline',
            'syllabus_explanation', 
            'assessment_breakdown',
            'study_strategies_course_specific',
            'instructor_information'
        ]
        self.restricted_topics = [
            'personal_life_advice',
            'other_courses',
            'campus_facilities',
            'social_recommendations'
        ]
    
    def generate_response(self, message, context):
        # Validate message is course-related
        if not self.is_course_related(message):
            return self.redirect_to_general_ai()
        
        # Generate course-specific response
        return self.generate_course_response(message, context)
    
    def redirect_to_general_ai(self):
        return {
            "response": "That's a great question, but it's outside my course-specific expertise. For broader university guidance, try our General AI Assistant!",
            "suggest_context_switch": "general"
        }
```

### Academic Progress AI Capabilities
```python
class AcademicProgressAIHandler:
    def __init__(self, student_context):
        self.capabilities = [
            'gpa_analysis',
            'study_pattern_insights',
            'time_management_optimization',
            'course_workload_balancing',
            'academic_goal_setting'
        ]
    
    def generate_response(self, message, context):
        # Analyze student performance data
        performance_insights = self.analyze_academic_data(context)
        
        # Generate personalized recommendations
        return self.generate_personalized_advice(message, performance_insights)
```

## 📊 **Usage Analytics & Optimization**

### Context-Specific Tracking
```tsx
const trackAIUsage = (
  contextType: AIContextType,
  message: string,
  studentId: string,
  additionalContext?: any
) => {
  analytics.track('ai_interaction', {
    context_type: contextType,
    message_category: categorizeMessage(message),
    student_id: studentId,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    ...additionalContext
  });
};

// Message categorization for analytics
const categorizeMessage = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('outline') || lowerMessage.includes('syllabus')) {
    return 'course_content_inquiry';
  }
  if (lowerMessage.includes('assessment') || lowerMessage.includes('exam')) {
    return 'assessment_guidance';
  }
  if (lowerMessage.includes('study') || lowerMessage.includes('prepare')) {
    return 'study_strategy_request';
  }
  if (lowerMessage.includes('gpa') || lowerMessage.includes('grade')) {
    return 'academic_performance_query';
  }
  if (lowerMessage.includes('campus') || lowerMessage.includes('dining')) {
    return 'campus_life_inquiry';
  }
  
  return 'general_question';
};
```

## 🔄 **Migration Strategy**

### Phase 1: Replace Existing Components
```tsx
// Replace CourseAIChat.tsx usage
// OLD:
<CourseAIChat courseContext={...} />

// NEW:
<UnifiedAIChat
  contextType="course"
  courseContext={...}
  buttonPosition="floating"
/>
```

### Phase 2: Replace GlobalChatButton.tsx
```tsx
// Replace GlobalChatButton.tsx usage
// OLD:
<GlobalChatButton />

// NEW:
<UnifiedAIChat
  contextType="academic-progress"
  studentContext={...}
  buttonPosition="floating"
/>
```

### Phase 3: Add New Contexts
```tsx
// Add campus life AI to map/facilities pages
<UnifiedAIChat
  contextType="campus-life"
  buttonPosition="floating"
  buttonSize="small"
/>
```

## 🎯 **Benefits of Unified Approach**

### For Development Team:
- **Single Component**: Maintain one AI chat component instead of multiple
- **Consistent UI/UX**: Same interaction patterns across contexts
- **Shared Infrastructure**: Common API handling, validation, error management
- **Easier Testing**: One component to test with different contexts

### For Students:
- **Contextual Intelligence**: AI understands exactly what they're asking about
- **Consistent Experience**: Same chat interface, different expertise levels
- **Clear Boundaries**: Know when to use course AI vs general AI
- **Progressive Disclosure**: Start with course questions, escalate to general AI

### for Backend Team:
- **Unified Endpoints**: Common API structure with context parameters
- **Specialized Models**: Different AI models/prompts for different contexts
- **Better Analytics**: Comprehensive tracking across all AI interactions
- **Scalable Architecture**: Easy to add new AI contexts in the future

## 🚀 **Future Enhancements**

1. **Context Switching**: Allow AI to suggest switching contexts when appropriate
2. **Cross-Context Memory**: AI remembers previous conversations across contexts
3. **Proactive Suggestions**: AI suggests relevant questions based on student activity
4. **Voice Integration**: Add voice input/output capabilities
5. **Multilingual Support**: Support multiple languages for international students

This unified approach gives you the best of both worlds: specialized AI assistance when needed, with the flexibility to expand into broader university support! 🎓✨