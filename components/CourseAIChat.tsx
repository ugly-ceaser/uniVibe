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
} from 'lucide-react-native';
import { ChatMessage } from '@/types';
import { validateChatMessage } from '@/utils/validation';
import { gradients, shadows } from '@/constants/theme';
import { useApi, aiApi } from '@/utils/api';

// Course-specific AI message types
interface CourseContext {
  courseId: string;
  courseCode: string;
  courseName: string;
  outline?: string[];
  assessment?: Array<{ type: string; percentage: number }>;
  instructor?: string;
  description?: string;
}

interface CourseAIChatProps {
  courseContext: CourseContext;
  onMessageSent?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  maxMessages?: number;
  typingSpeed?: 'slow' | 'normal' | 'fast';
  enableTypewriter?: boolean;
}

// Course-specific AI prompts and responses
const getCourseSpecificGreeting = (context: CourseContext): ChatMessage => ({
  id: '1',
  text: `Hello! I'm your AI assistant for ${context.courseCode} - ${context.courseName}. I can help you with:

📚 Course outline and topics
📝 Assignment guidance  
📊 Assessment breakdown
🎯 Study strategies
💡 Concept explanations
👨‍🏫 Instructor information

What would you like to know about this course?`,
  isUser: false,
  timestamp: new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
});

export default function CourseAIChat({
  courseContext,
  onMessageSent,
  onError,
  maxMessages = 50,
  typingSpeed = 'normal',
  enableTypewriter = true,
}: CourseAIChatProps): React.JSX.Element {
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const cursorIntervalRef = useRef<number | null>(null);

  // Initialize with course-specific greeting and load chat history
  useEffect(() => {
    const initializeCourseChat = async () => {
      try {
        setIsLoadingSession(true);
        console.log('🔄 Initializing course chat for:', courseContext.courseId);

        // First try to get existing session with chat history
        try {
          const sessionResponse = await aiApi(api).getCourseActiveSession(
            courseContext.courseId
          );
          console.log('📋 Session response:', sessionResponse);

          // Handle the actual backend response format: { data: { session: {...}, course: {...} } }
          const session = sessionResponse.data.session;
          setCurrentSessionId(session.id);

          // Check if we have messages in the session
          if (session.messages && session.messages.length > 0) {
            console.log(
              `💬 Found ${session.messages.length} existing messages`
            );

            // Convert session messages to ChatMessage format
            const sessionMessages = session.messages.map((msg, index) => ({
              id: msg.id || `session-msg-${index}`,
              text:
                msg.content || msg.role === 'user'
                  ? msg.content
                  : 'Message content unavailable',
              isUser: msg.role === 'user',
              timestamp: msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
            }));

            console.log('📝 Converted messages:', sessionMessages);
            setMessages(sessionMessages);

            // Show success message in console
            console.log('✅ Successfully loaded chat history');
            return;
          } else {
            console.log(
              '📝 No existing messages found, starting with greeting'
            );
          }
        } catch (sessionError) {
          console.warn('⚠️ Session API not available or failed:', sessionError);
          // Continue to fallback behavior
        }

        // Fallback: No existing messages or session API failed, start with greeting
        console.log('🎯 Starting with course greeting');
        setMessages([getCourseSpecificGreeting(courseContext)]);
      } catch (error) {
        console.error('❌ Failed to initialize course chat:', error);
        // Ultimate fallback to greeting only
        setMessages([getCourseSpecificGreeting(courseContext)]);
      } finally {
        setIsLoadingSession(false);
        console.log('✅ Course chat initialization complete');
      }
    };

    // Only initialize when we have a valid courseId and the modal is visible
    if (courseContext.courseId && isVisible) {
      initializeCourseChat();
    } else if (courseContext.courseId && !isVisible) {
      // When modal is closed, reset to greeting for fresh start next time
      setMessages([getCourseSpecificGreeting(courseContext)]);
      setCurrentSessionId(null);
    }
  }, [courseContext.courseId, api, isVisible]);

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

      // Validate message
      const validation = validateChatMessage(userMessage);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(', ');
        onError?.(errorMessage);
        Alert.alert('Validation Error', errorMessage);
        return;
      }

      // Check message limit
      if (messages.length >= maxMessages) {
        const errorMessage =
          'Maximum message limit reached. Please start a new conversation.';
        onError?.(errorMessage);
        Alert.alert('Message Limit', errorMessage);
        return;
      }

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      onMessageSent?.(userMessage);

      // Store the original input text to restore if needed
      const originalInputText = inputText.trim();
      setInputText(''); // Clear input optimistically

      // API call to backend AI service
      try {
        // Use course chat API (it automatically manages sessions on the backend)
        const response = await aiApi(api).courseChat({
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
          conversationHistory: messages.slice(1).map(msg => ({
            role: msg.isUser ? ('user' as const) : ('assistant' as const),
            content: msg.text,
          })),
          userMode: 'balanced',
        });

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

        // Start typing animation or show instantly
        if (enableTypewriter) {
          setTypingMessageId(aiResponseId);
          setShowCursor(true);
          animateTyping(aiResponseId, response.data.response);
        } else {
          // Show response immediately
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiResponseId
                ? { ...msg, text: response.data.response }
                : msg
            )
          );
          setIsLoading(false);
        }
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
      }
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
    courseContext,
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

  // Debug helper function to test session loading
  const testSessionLoading = useCallback(async () => {
    console.log(
      '🔍 Testing session loading for course:',
      courseContext.courseId
    );

    try {
      // Test 1: Try to get course chat sessions
      console.log('🔍 Test 1: Getting all course chat sessions');
      const allSessions = await aiApi(api).getCourseChatSessions(
        courseContext.courseId
      );
      console.log('✅ All sessions result:', allSessions);

      // Test 2: Try to get active session
      console.log('🔍 Test 2: Getting active session');
      const activeSession = await aiApi(api).getCourseActiveSession(
        courseContext.courseId
      );
      console.log('✅ Active session result:', activeSession);

      Alert.alert(
        'Debug Test',
        `Found session: ${activeSession.data.session.id}\nMessages: ${
          activeSession.data.session.messages?.length || 0
        }`
      );
    } catch (error) {
      console.error('❌ Session test failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Debug Test Failed', `Error: ${errorMsg}`);
    }
  }, [courseContext.courseId, api]);

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
        const speedMultiplier =
          typingSpeed === 'fast' ? 0.5 : typingSpeed === 'slow' ? 2 : 1;
        let delay = 50 * speedMultiplier; // Base delay

        if (char === ' ') delay = 80 * speedMultiplier; // Slower for spaces
        else if (char === '.' || char === '!' || char === '?')
          delay = 300 * speedMultiplier; // Pause at sentence endings
        else if (char === ',' || char === ';')
          delay = 150 * speedMultiplier; // Short pause at commas
        else if (char === '\n') delay = 200 * speedMultiplier; // Pause at line breaks

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

  return (
    <>
      <TouchableOpacity
        style={styles.floatingNotebookButton}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel={`Open course AI assistant for ${courseContext.courseCode}`}
        accessibilityHint='Get AI-powered insights about this specific course'
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.chatGradient}
        >
          {/* Clean chat icon */}
          <MessageCircle size={20} color='#ffffff' strokeWidth={2} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={handleClose}
        accessibilityLabel='Course AI Assistant Modal'
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header with course context */}
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderContent}>
              <BookOpen size={20} color='#10b981' strokeWidth={2} />
              <View style={styles.headerTextContainer}>
                <Text style={styles.chatHeaderTitle}>
                  {courseContext.courseCode} AI Assistant
                </Text>
                <Text style={styles.chatHeaderSubtitle}>
                  {courseContext.courseName}
                  {currentSessionId && (
                    <Text style={styles.sessionIndicator}>
                      {' '}
                      • Session Active
                    </Text>
                  )}
                </Text>
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

          {/* Quick action buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setInputText('Show me the course outline')}
            >
              <BookOpen size={14} color='#10b981' />
              <Text style={styles.quickActionText}>Outline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() =>
                setInputText('What are the assessment components?')
              }
            >
              <BookOpen size={14} color='#10b981' />
              <Text style={styles.quickActionText}>Assessment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setInputText('Give me study tips for this course')}
            >
              <Lightbulb size={14} color='#10b981' />
              <Text style={styles.quickActionText}>Study Tips</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
              ]}
              onPress={testSessionLoading}
            >
              <Text style={[styles.quickActionText, { color: '#dc2626' }]}>
                Test Session
              </Text>
            </TouchableOpacity>
          </View>

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
                <TouchableOpacity
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessage : styles.aiMessage,
                  ]}
                  accessibilityRole='text'
                  accessibilityLabel={`${
                    message.isUser ? 'You' : 'AI Assistant'
                  }: ${message.text}`}
                  onPress={() => {
                    // Tap to complete typing if this message is currently typing
                    if (
                      typingMessageId === message.id &&
                      typingTimeoutRef.current
                    ) {
                      clearTimeout(typingTimeoutRef.current);
                      if (cursorIntervalRef.current) {
                        clearInterval(cursorIntervalRef.current);
                      }
                      // Find the full text and display it immediately
                      // This would need the full text stored somewhere
                      setTypingMessageId(null);
                      setIsLoading(false);
                    }
                  }}
                  activeOpacity={typingMessageId === message.id ? 0.7 : 1}
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
                </TouchableOpacity>
              ))}
              {isLoadingSession && (
                <View style={[styles.messageContainer, styles.aiMessage]}>
                  <ActivityIndicator size='small' color='#10b981' />
                  <Text style={styles.aiMessageText}>
                    Loading chat history...
                  </Text>
                </View>
              )}
              {isLoading && !typingMessageId && !isLoadingSession && (
                <View style={[styles.messageContainer, styles.aiMessage]}>
                  <ActivityIndicator size='small' color='#10b981' />
                  <Text style={styles.aiMessageText}>
                    AI is analyzing your question...
                  </Text>
                </View>
              )}
              {typingMessageId && (
                <View style={[styles.messageContainer, styles.aiMessage]}>
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size='small' color='#10b981' />
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
              style={styles.chatInput}
              placeholder={`Ask anything about ${courseContext.courseCode}...`}
              placeholderTextColor='#9ca3af'
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
              editable={!isLoading}
              accessibilityLabel='Type your course question'
              accessibilityHint={`Enter your question about ${courseContext.courseName}`}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
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
  floatingNotebookButton: {
    position: 'absolute',
    right: 16,
    top: '80%',
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1000,
  },
  chatGradient: {
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
    color: '#059669',
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#10b981',
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
  sessionIndicator: {
    fontSize: 10,
    color: '#10b981',
    fontFamily: 'Inter-Medium',
  },
});
