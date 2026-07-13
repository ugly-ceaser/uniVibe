import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
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
import {
  MessageCircle,
  X,
  Send,
  Bot,
  BookOpen,
  Lightbulb,
  User,
  BarChart,
} from 'lucide-react-native';
import { ChatMessage } from '@/types';
import { validateChatMessage } from '@/utils/validation';
import { gradients, shadows } from '@/constants/theme';
import {
  useApi,
  aiApi,
  AIChatRequest,
  GeneralChatRequest,
  AcademicChatRequest,
} from '@/utils/api';

// Unified AI context types
export type AIContextType =
  | 'course'
  | 'general'
  | 'academic-progress'
  | 'campus-life';

interface CourseContext {
  courseId: string;
  courseCode: string;
  courseName: string;
  outline?: string[];
  assessment?: Array<{ type: string; percentage: number }>;
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
  const scrollViewRef = useRef<ScrollView>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [showCursor, setShowCursor] = useState(true);
  const typingTimeoutRef = useRef<number | null>(null);
  const cursorIntervalRef = useRef<number | null>(null);

  // Initialize with context-specific greeting
  useEffect(() => {
    setMessages([
      getContextualGreeting(contextType, courseContext, studentContext),
    ]);
  }, [contextType, courseContext, studentContext]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      // Small delay to ensure the message is rendered before scrolling
      const timeoutId = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, isLoading]);

  // Auto-scroll when modal opens
  useEffect(() => {
    if (isVisible && scrollViewRef.current && messages.length > 0) {
      // Delay to ensure modal animation completes
      const timeoutId = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [isVisible]);

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
        const errorMessage =
          'Maximum message limit reached. Please start a new conversation.';
        onError?.(errorMessage);
        Alert.alert('Message Limit', errorMessage);
        return;
      }

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      onMessageSent?.(userMessage, contextType);

      // Store the original input text to restore if needed
      const originalInputText = inputText.trim();
      setInputText(''); // Clear input optimistically

      // API call based on context
      try {
        let response;
        const conversationHistory = messages.slice(1).map(msg => ({
          role: msg.isUser ? ('user' as const) : ('assistant' as const),
          content: msg.text,
        }));

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
              description: courseContext.description,
            },
            conversationHistory,
            userMode: 'balanced',
          });
        } else if (contextType === 'academic-progress' && studentContext) {
          response = await aiApi(api).academicChat({
            message: userMessage.text,
            studentContext: {
              studentId: studentContext.studentId,
              currentGPA: studentContext.currentGPA,
              enrolledCourses: studentContext.enrolledCourses,
              completedCourses: studentContext.completedCourses,
              strugglingSubjects: studentContext.strugglingSubjects,
              studyHours: studentContext.studyHours,
              activeForumPosts: studentContext.activeForumPosts,
            },
            conversationHistory,
            userMode: 'smart',
          });
        } else {
          response = await aiApi(api).generalChat({
            message: userMessage.text,
            conversationHistory,
            userMode: 'balanced',
          });
        }

        const aiResponseId = (Date.now() + 1).toString();
        const aiResponse: ChatMessage = {
          id: aiResponseId,
          text: '', // Start with empty text for typing effect
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        // Add empty AI message first
        setMessages(prev => [...prev, aiResponse]);
        setFailedMessage(null); // Clear any previous failed message

        // Start typing animation
        setTypingMessageId(aiResponseId);
        setShowCursor(true);
        animateTyping(aiResponseId, response.data.response);
      } catch (apiError) {
        console.error('AI API failed:', apiError);
        // Restore the original input text on failure
        setInputText(originalInputText);
        setFailedMessage(originalInputText);
        // Remove the user message that was optimistically added
        setMessages(prev => prev.slice(0, -1));

        const errorMessage =
          apiError instanceof Error
            ? apiError.message
            : 'AI service is currently unavailable';
        onError?.(errorMessage);
        Alert.alert(
          'Message Failed to Send',
          "Your message couldn't be sent. It has been restored to the input field so you can try again.",
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
    } catch (error) {
      // If we haven't cleared the input yet, we don't need to restore it
      // This handles validation errors and early returns
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  }, [
    inputText,
    messages.length,
    maxMessages,
    onMessageSent,
    onError,
    contextType,
    courseContext,
    studentContext,
    api,
  ]);

  const handleClose = useCallback((): void => {
    setIsVisible(false);
    setInputText('');
  }, []);

  const handleInputChange = useCallback((text: string): void => {
    if (text.length <= 500) {
      setInputText(text);
    }
  }, []);

  // Handle scroll position to show/hide scroll-to-bottom button
  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const isNearBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
      setShowScrollButton(!isNearBottom && messages.length > 3);
    },
    [messages.length]
  );

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
  }, []);

  // Typewriter effect function
  const animateTyping = useCallback(
    (messageId: string, fullText: string, currentIndex: number = 0) => {
      if (currentIndex < fullText.length) {
        const displayText = fullText.substring(0, currentIndex + 1);

        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, text: displayText + (showCursor ? '|' : '') }
              : msg
          )
        );

        // Variable typing speed for more natural feel
        const char = fullText[currentIndex];
        let delay = 50; // Base delay

        if (char === ' ') delay = 80; // Slower for spaces
        else if (char === '.' || char === '!' || char === '?')
          delay = 300; // Pause at sentence endings
        else if (char === ',' || char === ';')
          delay = 150; // Short pause at commas
        else if (char === '\n') delay = 200; // Pause at line breaks

        typingTimeoutRef.current = setTimeout(() => {
          animateTyping(messageId, fullText, currentIndex + 1);
        }, delay) as unknown as number;
      } else {
        // Typing complete - remove cursor and clean up
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, text: fullText } : msg
          )
        );
        setTypingMessageId(null);
        setIsLoading(false);
        if (cursorIntervalRef.current) {
          clearInterval(cursorIntervalRef.current);
          cursorIntervalRef.current = null;
        }
      }
    },
    [showCursor]
  );

  // Cursor blinking effect
  useEffect(() => {
    if (typingMessageId) {
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500) as unknown as number;
    } else {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      setShowCursor(true);
    }
  }, [typingMessageId]);

  // Cleanup typing animation on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  const isInputValid = useMemo((): boolean => {
    return inputText.trim().length > 0 && !isLoading;
  }, [inputText, isLoading]);

  // Dynamic button styles based on props
  const getButtonStyles = () => {
    const baseSize =
      buttonSize === 'small' ? 40 : buttonSize === 'large' ? 56 : 44;
    const iconSize =
      buttonSize === 'small' ? 16 : buttonSize === 'large' ? 24 : 20;

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
          icon: (
            <MessageCircle size={iconSize} color='#ffffff' strokeWidth={2} />
          ),
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
        accessibilityHint={`Get AI assistance for ${
          contextType === 'course'
            ? 'course-specific questions'
            : 'university life'
        }`}
      >
        <LinearGradient
          colors={colors as [string, string]}
          style={styles.buttonGradient}
        >
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
                  <Text style={styles.chatHeaderSubtitle}>
                    {courseContext.courseName}
                  </Text>
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
                <Text style={[styles.quickActionText, { color: colors[0] }]}>
                  Outline
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() =>
                  setInputText('What are the assessment components?')
                }
              >
                <BarChart size={14} color={colors[0]} />
                <Text style={[styles.quickActionText, { color: colors[0] }]}>
                  Assessment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() =>
                  setInputText('Give me study tips for this course')
                }
              >
                <Lightbulb size={14} color={colors[0]} />
                <Text style={[styles.quickActionText, { color: colors[0] }]}>
                  Study Tips
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flex: 1, position: 'relative' }}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatContent}
              showsVerticalScrollIndicator={false}
              accessibilityLabel='Chat messages'
              contentContainerStyle={{ paddingBottom: 10 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {messages.map(message => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessage : styles.aiMessage,
                  ]}
                  accessibilityRole='text'
                  accessibilityLabel={`${
                    message.isUser ? 'You' : 'AI Assistant'
                  }: ${message.text}`}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser
                        ? styles.userMessageText
                        : styles.aiMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.isUser
                        ? styles.userMessageTime
                        : styles.aiMessageTime,
                    ]}
                  >
                    {message.timestamp}
                  </Text>
                </View>
              ))}
              {isLoading && !typingMessageId && (
                <View style={[styles.messageContainer, styles.aiMessage]}>
                  <ActivityIndicator size='small' color={colors[0]} />
                  <Text style={styles.aiMessageText}>
                    AI is analyzing your question...
                  </Text>
                </View>
              )}
              {typingMessageId && (
                <View style={[styles.messageContainer, styles.aiMessage]}>
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size='small' color={colors[0]} />
                    <Text style={styles.aiMessageText}>AI is typing...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <TouchableOpacity
                style={styles.scrollToBottomButton}
                onPress={scrollToBottom}
                activeOpacity={0.8}
                accessibilityLabel='Scroll to bottom'
              >
                <Text style={styles.scrollToBottomText}>↓</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.chatInputContainer}>
            <TextInput
              style={[
                styles.chatInput,
                failedMessage &&
                  failedMessage === inputText &&
                  styles.chatInputError,
              ]}
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
              onChangeText={text => {
                handleInputChange(text);
                // Clear failed message state when user starts typing new content
                if (failedMessage && text !== failedMessage) {
                  setFailedMessage(null);
                }
              }}
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
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  scrollToBottomText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatInputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
