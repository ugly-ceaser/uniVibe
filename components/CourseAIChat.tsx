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
import { MessageCircle, X, Send, Bot, BookOpen, Lightbulb } from 'lucide-react-native';
import { ChatMessage } from '@/types';
import { validateChatMessage } from '@/utils/validation';
import { gradients, shadows } from '@/constants/theme';
import { useApi } from '@/utils/api';

// Course-specific AI message types
interface CourseContext {
  courseId: string;
  courseCode: string;
  courseName: string;
  outline?: string[];
  assessment?: Array<{type: string; percentage: number}>;
  instructor?: string;
  description?: string;
}

interface CourseAIChatProps {
  courseContext: CourseContext;
  onMessageSent?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  maxMessages?: number;
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

// Enhanced course-specific AI responses
const generateCourseResponse = (userMessage: string, context: CourseContext): string => {
  const message = userMessage.toLowerCase();
  
  // Course outline related
  if (message.includes('outline') || message.includes('topics') || message.includes('syllabus')) {
    if (context.outline && context.outline.length > 0) {
      return `Here's the course outline for ${context.courseCode}:

${context.outline.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

Would you like me to explain any specific topic in detail?`;
    }
    return `The course outline for ${context.courseCode} covers various important topics. You can find the detailed syllabus in your course materials or ask your instructor ${context.instructor || 'your course coordinator'} for more information.`;
  }
  
  // Assessment related
  if (message.includes('assessment') || message.includes('exam') || message.includes('assignment') || message.includes('grade')) {
    if (context.assessment && context.assessment.length > 0) {
      return `Here's the assessment breakdown for ${context.courseCode}:

${context.assessment.map(a => `• ${a.type}: ${a.percentage}%`).join('\n')}

Remember to prepare well for each component as they all contribute to your final grade!`;
    }
    return `For detailed assessment information in ${context.courseCode}, please refer to your course handbook or contact ${context.instructor || 'your instructor'}.`;
  }
  
  // Study strategies
  if (message.includes('study') || message.includes('prepare') || message.includes('tips')) {
    return `Here are some study strategies for ${context.courseCode}:

🎯 **Focus Areas:**
• Review course outline regularly
• Practice with past questions
• Form study groups with classmates
• Attend all lectures and tutorials

📚 **Study Schedule:**
• Break topics into manageable chunks
• Allocate more time to complex topics
• Review material within 24 hours of learning

Need help with any specific topic?`;
  }
  
  // Instructor information
  if (message.includes('instructor') || message.includes('teacher') || message.includes('lecturer') || message.includes('contact')) {
    return `For ${context.courseCode}, your course coordinator is ${context.instructor || 'listed in your course materials'}.

📧 You can reach out during office hours or via email for:
• Course-related questions
• Assignment clarifications  
• Additional resources
• Academic guidance

Always be respectful and specific in your communications!`;
  }
  
  // Default course-specific response
  const responses = [
    `Great question about ${context.courseCode}! Based on the course content, I'd recommend focusing on the key concepts and practical applications.`,
    `For ${context.courseName}, understanding the fundamentals is crucial. Would you like me to break down any specific topic?`,
    `That's an important aspect of ${context.courseCode}. Let me help you understand this better with some practical examples.`,
    `In ${context.courseName}, this concept connects to several other topics. Here's how you can approach it systematically.`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

export default function CourseAIChat({
  courseContext,
  onMessageSent,
  onError,
  maxMessages = 50,
}: CourseAIChatProps): React.JSX.Element {
  const api = useApi();
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with course-specific greeting
  useEffect(() => {
    setMessages([getCourseSpecificGreeting(courseContext)]);
  }, [courseContext]);

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
        const errorMessage = 'Maximum message limit reached. Please start a new conversation.';
        onError?.(errorMessage);
        Alert.alert('Message Limit', errorMessage);
        return;
      }

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);
      onMessageSent?.(userMessage);

      // TODO: Replace with actual API call to your backend
      // Example API call structure:
      /*
      const response = await api.authPost('/ai/chat/course', {
        message: userMessage.text,
        courseId: courseContext.courseId,
        context: {
          courseCode: courseContext.courseCode,
          courseName: courseContext.courseName,
          outline: courseContext.outline,
          assessment: courseContext.assessment
        }
      });
      */

      // Simulate AI response with course context
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: generateCourseResponse(userMessage.text, courseContext),
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  }, [inputText, messages.length, maxMessages, onMessageSent, onError, courseContext, api]);

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
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.chatGradient}>
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
              onPress={() => setInputText('What are the assessment components?')}
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
          </View>

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
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.aiMessageText}>AI is analyzing your question...</Text>
              </View>
            )}
          </ScrollView>

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
});