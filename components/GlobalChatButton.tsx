import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, X, Send, Bot } from 'lucide-react-native';
import { ChatMessage } from '@/types';
import { validateChatMessage } from '@/utils/validation';
import { gradients, shadows, animation } from '@/constants/theme';

const MOCK_AI_RESPONSES = [
  'Great question! For academic success, I recommend creating a study schedule and sticking to it. Break down your coursework into manageable chunks.',
  "That's a common concern for freshers! Try joining study groups and don't hesitate to ask your lecturers for help during office hours.",
  'For budgeting, track your expenses weekly and prioritize needs over wants. Look for student discounts wherever possible.',
  'Campus safety is important! Always walk in groups at night and save the security office number in your phone.',
  "Social life balance is key! Join clubs that interest you, but don't overcommit. Quality friendships matter more than quantity.",
] as const;

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  text: "Hello! I'm your AI assistant. How can I help you with your university life today?",
  isUser: false,
  timestamp: new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
};

interface GlobalChatButtonProps {
  onMessageSent?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  maxMessages?: number;
}

export default function GlobalChatButton({
  onMessageSent,
  onError,
  maxMessages = 100,
}: GlobalChatButtonProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(async (): Promise<void> => {
    try {
      if (!inputText.trim()) {
        return;
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: inputText.trim(),
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Validate message before sending
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
      setInputText('');
      setIsLoading(true);

      // Notify parent component
      onMessageSent?.(userMessage);

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: MOCK_AI_RESPONSES[
            Math.floor(Math.random() * MOCK_AI_RESPONSES.length)
          ],
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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';
      onError?.(errorMessage || 'Failed to send message');
      Alert.alert('Error', errorMessage || 'Failed to send message');
      setIsLoading(false);
    }
  }, [inputText, messages.length, maxMessages, onMessageSent, onError]);

  const handleClose = useCallback((): void => {
    setIsVisible(false);
    setInputText('');
  }, []);

  const handleInputChange = useCallback((text: string): void => {
    if (text.length <= 500) {
      // Limit input length
      setInputText(text);
    }
  }, []);

  const isInputValid = useMemo((): boolean => {
    return inputText.trim().length > 0 && !isLoading;
  }, [inputText, isLoading]);

  const messageCount = useMemo(
    (): number => messages.length,
    [messages.length]
  );

  // Accessibility
  React.useEffect(() => {
    if (isVisible) {
      // Note: announce is not available in all React Native versions
      // AccessibilityInfo.announce('Chat modal opened');
    }
  }, [isVisible]);

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.8}
        accessibilityRole='button'
        accessibilityLabel='Open AI chat assistant'
        accessibilityHint='Opens a chat interface to get help with university life'
      >
        <LinearGradient colors={gradients.primary} style={styles.fabGradient}>
          <MessageCircle size={24} color='#ffffff' strokeWidth={2} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={handleClose}
        accessibilityLabel='AI Chat Assistant Modal'
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderContent}>
              <Bot size={24} color={gradients.primary[0]} strokeWidth={2} />
              <Text style={styles.chatHeaderTitle}>AI Assistant</Text>
              <Text style={styles.messageCount}>({messageCount})</Text>
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
            {isLoading && (
              <View
                style={[styles.messageContainer, styles.aiMessage]}
                accessibilityLabel='AI is typing'
              >
                <Text style={styles.aiMessageText}>AI is typing...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder='Ask me anything about university life...'
              placeholderTextColor='#9ca3af'
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
              editable={!isLoading}
              accessibilityLabel='Type your message'
              accessibilityHint='Enter your question about university life'
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
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...shadows.lg,
    zIndex: 1000,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    marginLeft: 12,
  },
  messageCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  chatContent: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: gradients.primary[0],
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
    fontSize: 16,
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
    fontSize: 12,
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
    backgroundColor: gradients.primary[0],
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
