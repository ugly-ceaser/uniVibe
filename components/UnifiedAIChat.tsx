import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, X, Send, Bot, BookOpen, Lightbulb, User, BarChart } from 'lucide-react-native';
import { ChatMessage } from '@/types';
import { validateChatMessage } from '@/utils/validation';
import { gradients, shadows } from '@/constants/theme';
import { useApi, aiApi } from '@/utils/api';

// Unified AI context types
export type AIContextType = 'course' | 'general' | 'academic-progress' | 'campus-life';

interface CourseContext {
  courseId: string;
  courseCode: string;
  courseName: string;
  outline?: string[];
  assessment?: Array<{type: string; percentage: number}>;
  instructor?: string;
  description?: string;
}

interface StudentContext {
  studentId: string;
  enrolledCourses?: string[];
  completedCourses?: string[];
  currentGPA?: number;
  studyHours?: number;
  activeForumPosts?: number;
  strugglingSubjects?: string[];
}

interface UnifiedAIChatProps {
  // Context determines AI behavior
  contextType: AIContextType;
  
  // Course-specific context (when contextType is 'course')
  courseContext?: CourseContext;
  
  // Student-specific context (for broader conversations)
  studentContext?: StudentContext;
  
  // Button appearance
  buttonPosition?: 'floating' | 'inline';
  buttonSize?: 'small' | 'medium' | 'large';
  
  // Callbacks
  onMessageSent?: (message: ChatMessage, context: AIContextType) => void;
  onError?: (error: string) => void;
  maxMessages?: number;
}

// Context-specific greetings and capabilities
const getContextualGreeting = (
  contextType: AIContextType, 
  courseContext?: CourseContext, 
  studentContext?: StudentContext
): ChatMessage => {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  switch (contextType) {
    case 'course':
      return {
        id: '1',
        text: `Hello! I'm your AI assistant for ${courseContext?.courseCode} - ${courseContext?.courseName}. I can help you with:

📚 Course outline and topics
📝 Assignment guidance  
📊 Assessment breakdown
🎯 Study strategies for this course
💡 Concept explanations
👨‍🏫 Instructor information

What would you like to know about this course?`,
        isUser: false,
        timestamp,
      };

    case 'academic-progress':
      return {
        id: '1',
        text: `Hi! I'm your Academic Progress AI Assistant. I can help you with:

📈 Overall academic performance analysis
📊 Study pattern insights
🎯 Personalized study recommendations
📚 Course workload management
⏰ Time management strategies
🏆 Goal setting and tracking

Based on your activity, how can I help you improve your academic journey?`,
        isUser: false,
        timestamp,
      };

    case 'campus-life':
      return {
        id: '1',
        text: `Hey there! I'm your Campus Life AI Assistant. I can help you with:

🏫 Campus navigation and services
🍕 Dining options and recommendations  
🏃‍♂️ Recreation and fitness facilities
📅 Events and activities
🚌 Transportation options
💰 Budgeting and financial tips
🤝 Social connections and clubs

What aspect of campus life can I help you with today?`,
        isUser: false,
        timestamp,
      };

    default: // 'general'
      return {
        id: '1',
        text: `Hello! I'm your University AI Assistant. I can help you with:

📚 Academic questions and study tips
🏫 Campus life and services
📊 Academic progress tracking
🎯 Goal setting and planning
💡 General university guidance

How can I assist you with your university experience today?`,
        isUser: false,
        timestamp,
      };
  }
};

// Context-specific response generation
const generateContextualResponse = (
  message: string,
  contextType: AIContextType,
  courseContext?: CourseContext,
  studentContext?: StudentContext
): string => {
  const userMessage = message.toLowerCase();

  switch (contextType) {
    case 'course':
      return generateCourseResponse(userMessage, courseContext!);
    
    case 'academic-progress':
      return generateAcademicProgressResponse(userMessage, studentContext!);
    
    case 'campus-life':
      return generateCampusLifeResponse(userMessage);
    
    default:
      return generateGeneralResponse(userMessage);
  }
};

// Course-specific responses (moved from CourseAIChat)
const generateCourseResponse = (userMessage: string, context: CourseContext): string => {
  // Course outline related
  if (userMessage.includes('outline') || userMessage.includes('topics') || userMessage.includes('syllabus')) {
    if (context.outline && context.outline.length > 0) {
      return `Here's the course outline for ${context.courseCode}:

${context.outline.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

Would you like me to explain any specific topic in detail?`;
    }
    return `The course outline for ${context.courseCode} covers various important topics. You can find the detailed syllabus in your course materials or ask your instructor ${context.instructor || 'your course coordinator'} for more information.`;
  }
  
  // Assessment related
  if (userMessage.includes('assessment') || userMessage.includes('exam') || userMessage.includes('assignment')) {
    if (context.assessment && context.assessment.length > 0) {
      return `Here's the assessment breakdown for ${context.courseCode}:

${context.assessment.map(a => `• ${a.type}: ${a.percentage}%`).join('\n')}

Remember to prepare well for each component as they all contribute to your final grade!`;
    }
    return `For detailed assessment information in ${context.courseCode}, please refer to your course handbook or contact ${context.instructor || 'your instructor'}.`;
  }

  return `That's a great question about ${context.courseCode}! Based on the course content, I'd recommend focusing on the key concepts and practical applications. Would you like me to break down any specific topic?`;
};

// Academic progress responses
const generateAcademicProgressResponse = (userMessage: string, context: StudentContext): string => {
  if (userMessage.includes('gpa') || userMessage.includes('grade') || userMessage.includes('performance')) {
    return `Based on your current academic standing${context.currentGPA ? ` (GPA: ${context.currentGPA})` : ''}, here are some insights:

📊 **Performance Analysis:**
${context.currentGPA && context.currentGPA >= 3.5 ? 
  '• You\'re performing excellently! Keep up the great work.' : 
  '• There\'s room for improvement. Let\'s work on study strategies.'
}

🎯 **Recommendations:**
• Review your study methods for struggling subjects
• Consider forming study groups for challenging courses
• Utilize office hours and tutoring resources

Would you like specific advice for any particular subject?`;
  }

  if (userMessage.includes('study') || userMessage.includes('time management')) {
    return `Here's a personalized study plan based on your activity:

⏰ **Time Management:**
${context.studyHours ? 
  `• Current study time: ${context.studyHours} hours/week
• Recommended: ${Math.max(context.studyHours + 5, 25)} hours/week for optimal performance` :
  '• Aim for 25-30 hours of focused study per week'
}

📚 **Study Strategy:**
• Break study sessions into 25-50 minute focused blocks
• Prioritize challenging subjects during peak energy hours
${context.strugglingSubjects ? 
  `• Extra attention needed for: ${context.strugglingSubjects.join(', ')}` : 
  ''
}

Need help with specific study techniques?`;
  }

  return `I can help you optimize your academic performance! Whether it's study strategies, time management, or course planning, I'm here to provide personalized guidance based on your academic journey.`;
};

// Campus life responses
const generateCampusLifeResponse = (userMessage: string): string => {
  if (userMessage.includes('food') || userMessage.includes('dining') || userMessage.includes('eat')) {
    return `🍕 **Dining Options on Campus:**

• **Main Cafeteria**: All-you-can-eat meals, great variety
• **Food Court**: Quick options between classes
• **Coffee Shops**: Perfect for study breaks
• **Late Night Snacks**: Available until 11 PM

💰 **Budget Tips:**
• Meal plans offer better value than individual purchases
• Happy hour specials 3-5 PM
• Student discounts available with ID

What type of food are you in the mood for?`;
  }

  if (userMessage.includes('event') || userMessage.includes('activity') || userMessage.includes('club')) {
    return `🎉 **Campus Events & Activities:**

📅 **This Week:**
• Study groups and tutoring sessions
• Intramural sports registration
• Career fair preparation workshops
• Cultural events and performances

🤝 **Getting Involved:**
• Join clubs related to your interests
• Volunteer opportunities available
• Leadership development programs
• Peer mentoring programs

Would you like information about specific types of activities?`;
  }

  return `Campus life has so much to offer! From dining and recreation to events and social opportunities, I can help you make the most of your university experience. What would you like to explore?`;
};

// General responses
const generateGeneralResponse = (userMessage: string): string => {
  const responses = [
    `That's a great question! Let me help you with that. Based on your university experience, here's what I recommend...`,
    `I understand you're looking for guidance. As your AI assistant, I can provide personalized advice for your academic journey.`,
    `Excellent question! This is something many students ask about. Here's how I can help you navigate this...`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

export default function UnifiedAIChat({
  contextType,
  courseContext,
  studentContext,
  buttonPosition = 'floating',
  buttonSize = 'medium',
  onMessageSent,
  onError,
  maxMessages = 50,
}: UnifiedAIChatProps): React.JSX.Element {
  const api = useApi();
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with context-specific greeting
  useEffect(() => {
    setMessages([getContextualGreeting(contextType, courseContext, studentContext)]);
  }, [contextType, courseContext, studentContext]);

  const handleSend = useCallback(async (): Promise<void> => {
    try {
      if (!inputText.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: inputText.trim(),
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const validation = validateChatMessage(userMessage);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(', ');
        onError?.(errorMessage);
        Alert.alert('Validation Error', errorMessage);
        return;
      }

      if (messages.length >= maxMessages) {
        const errorMessage = 'Maximum message limit reached. Please start a new conversation.';
        onError?.(errorMessage);
        Alert.alert('Message Limit', errorMessage);
        return;
      }

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);
      onMessageSent?.(userMessage, contextType);

      // API call based on context
      try {
        let response;
        if (contextType === 'course' && courseContext) {
          response = await aiApi(api).courseChat({
            message: userMessage.text,
            courseId: courseContext.courseId,
            context: {
              courseCode: courseContext.courseCode,
              courseName: courseContext.courseName,
              outline: courseContext.outline,
              assessment: courseContext.assessment,
              instructor: courseContext.instructor,
              description: courseContext.description
            },
            conversationHistory: messages.slice(1).map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.text
            }))
          });
        } else {
          response = await aiApi(api).generalChat(
            userMessage.text,
            messages.slice(1).map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.text
            }))
          );
        }

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.data.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages(prev => [...prev, aiResponse]);
      } catch (apiError) {
        // Fallback to context-based mock responses
        console.warn('AI API failed, using contextual mock response:', apiError);
        setTimeout(() => {
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: generateContextualResponse(userMessage.text, contextType, courseContext, studentContext),
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          setMessages(prev => [...prev, aiResponse]);
          setIsLoading(false);
        }, 1500);
        return;
      }

      setIsLoading(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  }, [inputText, messages.length, maxMessages, onMessageSent, onError, contextType, courseContext, studentContext, api]);

  const handleClose = useCallback((): void => {
    setIsVisible(false);
    setInputText('');
  }, []);

  const handleInputChange = useCallback((text: string): void => {
    if (text.length <= 500) {
      setInputText(text);
    }
  }, []);

  const isInputValid = useMemo((): boolean => {
    return inputText.trim().length > 0 && !isLoading;
  }, [inputText, isLoading]);

  // Dynamic button styles based on props
  const getButtonStyles = () => {
    const baseSize = buttonSize === 'small' ? 40 : buttonSize === 'large' ? 56 : 44;
    const iconSize = buttonSize === 'small' ? 16 : buttonSize === 'large' ? 24 : 20;
    
    return {
      buttonStyles: {
        ...styles.floatingButton,
        width: baseSize,
        height: baseSize,
        borderRadius: baseSize / 2,
        ...(buttonPosition === 'inline' && {
          position: 'relative' as const,
          margin: 8,
        }),
      },
      iconSize,
    };
  };

  const { buttonStyles, iconSize } = getButtonStyles();

  // Context-specific button colors and icons
  const getContextualAppearance = () => {
    switch (contextType) {
      case 'course':
        return {
          colors: ['#667eea', '#764ba2'],
          icon: <BookOpen size={iconSize} color='#ffffff' strokeWidth={2} />,
          label: courseContext ? `${courseContext.courseCode} AI` : 'Course AI',
        };
      case 'academic-progress':
        return {
          colors: ['#f093fb', '#f5576c'],
          icon: <BarChart size={iconSize} color='#ffffff' strokeWidth={2} />,
          label: 'Progress AI',
        };
      case 'campus-life':
        return {
          colors: ['#4facfe', '#00f2fe'],
          icon: <User size={iconSize} color='#ffffff' strokeWidth={2} />,
          label: 'Campus AI',
        };
      default:
        return {
          colors: ['#667eea', '#764ba2'],
          icon: <MessageCircle size={iconSize} color='#ffffff' strokeWidth={2} />,
          label: 'AI Assistant',
        };
    }
  };

  const { colors, icon, label } = getContextualAppearance();

  return (
    <>
      <TouchableOpacity
        style={buttonStyles}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel={`Open ${label}`}
        accessibilityHint={`Get AI assistance for ${contextType === 'course' ? 'course-specific questions' : 'university life'}`}
      >
        <LinearGradient colors={colors as [string, string]} style={styles.buttonGradient}>
          {icon}
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={handleClose}
        accessibilityLabel={`${label} Modal`}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Context-aware header */}
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderContent}>
              {contextType === 'course' ? (
                <BookOpen size={20} color={colors[0]} strokeWidth={2} />
              ) : contextType === 'academic-progress' ? (
                <BarChart size={20} color={colors[0]} strokeWidth={2} />
              ) : contextType === 'campus-life' ? (
                <User size={20} color={colors[0]} strokeWidth={2} />
              ) : (
                <Bot size={20} color={colors[0]} strokeWidth={2} />
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.chatHeaderTitle}>{label}</Text>
                {contextType === 'course' && courseContext && (
                  <Text style={styles.chatHeaderSubtitle}>{courseContext.courseName}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole='button'
              accessibilityLabel='Close chat'
            >
              <X size={24} color='#9ca3af' strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Context-specific quick actions */}
          {contextType === 'course' && (
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setInputText('Show me the course outline')}
              >
                <BookOpen size={14} color={colors[0]} />
                <Text style={[styles.quickActionText, { color: colors[0] }]}>Outline</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setInputText('What are the assessment components?')}
              >
                <BarChart size={14} color={colors[0]} />
                <Text style={[styles.quickActionText, { color: colors[0] }]}>Assessment</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setInputText('Give me study tips for this course')}
              >
                <Lightbulb size={14} color={colors[0]} />
                <Text style={[styles.quickActionText, { color: colors[0] }]}>Study Tips</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            style={styles.chatContent}
            showsVerticalScrollIndicator={false}
            accessibilityLabel='Chat messages'
          >
            {messages.map(message => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage,
                ]}
                accessibilityRole='text'
                accessibilityLabel={`${message.isUser ? 'You' : 'AI Assistant'}: ${message.text}`}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.aiMessageText,
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.isUser ? styles.userMessageTime : styles.aiMessageTime,
                  ]}
                >
                  {message.timestamp}
                </Text>
              </View>
            ))}
            {isLoading && (
              <View style={[styles.messageContainer, styles.aiMessage]}>
                <ActivityIndicator size="small" color={colors[0]} />
                <Text style={styles.aiMessageText}>AI is analyzing your question...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder={
                contextType === 'course' 
                  ? `Ask about ${courseContext?.courseCode || 'this course'}...`
                  : contextType === 'academic-progress'
                  ? 'Ask about your academic progress...'
                  : contextType === 'campus-life'
                  ? 'Ask about campus life...'
                  : 'Ask me anything about university life...'
              }
              placeholderTextColor='#9ca3af'
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
              editable={!isLoading}
              accessibilityLabel='Type your question'
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors[0] },
                !isInputValid && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!isInputValid}
              accessibilityRole='button'
              accessibilityLabel='Send message'
              accessibilityState={{ disabled: !isInputValid }}
            >
              <Send size={20} color='#ffffff' strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.characterCount}>{inputText.length}/500</Text>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 16,
    top: '80%',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1000,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  chatContent: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    ...shadows.sm,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#374151',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiMessageTime: {
    color: '#9ca3af',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  characterCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    paddingBottom: 10,
    fontFamily: 'Inter-Regular',
  },
});