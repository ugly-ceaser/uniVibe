import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import {
  BookOpen,
  Lightbulb,
  RefreshCw,
  Send,
} from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import type { Course } from '@/types/course';
import { aiApi, useApi } from '@/utils/api';
import { validateChatMessage } from '@/utils/validation';

interface CourseAIChatProps {
  course: Course;
  onMessageSent?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  maxMessages?: number;
}

type SessionState = 'loading' | 'ready' | 'error';

const formatTime = (value?: string): string => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Please try again.';

export default function CourseAIChat({
  course,
  onMessageSent,
  onError,
  maxMessages = 50,
}: CourseAIChatProps): React.JSX.Element {
  const api = useApi();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadSession = useCallback(async () => {
    setSessionState('loading');
    setSessionError(null);
    try {
      const response = await aiApi(api).getCourseActiveSession(course.id);
      const session = response.data.session;
      setSessionId(session.id);
      setMessages(
        session.messages
          .filter(message => message.role !== 'system')
          .map(message => ({
            id: message.id,
            text: message.content,
            isUser: message.role === 'user',
            timestamp: formatTime(message.createdAt),
          }))
      );
      setSessionState('ready');
    } catch (error) {
      const message = errorMessage(error);
      setSessionId(null);
      setMessages([]);
      setSessionError(message);
      setSessionState('error');
      onError?.(message);
    }
  }, [api, course.id, onError]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const timeoutId = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80
    );
    return () => clearTimeout(timeoutId);
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    const originalText = inputText.trim();
    if (!originalText || sending || sessionState !== 'ready') return;

    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      text: originalText,
      isUser: true,
      timestamp: formatTime(),
    };
    const validation = validateChatMessage(userMessage);
    if (!validation.isValid) {
      Alert.alert('Cannot send message', validation.errors.join(', '));
      return;
    }
    if (messages.length >= maxMessages) {
      Alert.alert(
        'Conversation limit reached',
        'Clear this conversation before sending more messages.'
      );
      return;
    }

    const priorMessages = messages;
    setMessages(current => [...current, userMessage]);
    setInputText('');
    setFailedMessage(null);
    setSending(true);
    onMessageSent?.(userMessage);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    try {
      const response = await aiApi(api).courseChat({
        message: originalText,
        courseId: course.id,
        context: {
          courseCode: course.courseCode,
          courseName: course.title,
          outline: course.outline,
          assessment: course.assessment,
          instructor: course.instructor,
          description: course.description,
        },
        conversationHistory: priorMessages.map(message => ({
          role: message.isUser ? 'user' : 'assistant',
          content: message.text,
        })),
        userMode: 'balanced',
      });

      const responseText = response.data.response?.trim();
      if (!responseText) {
        throw new Error('The AI service returned an empty response.');
      }
      if (response.sessionId) setSessionId(response.sessionId);
      setMessages(current => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          text: responseText,
          isUser: false,
          timestamp: formatTime(),
        },
      ]);
    } catch (error) {
      const message = errorMessage(error);
      setMessages(priorMessages);
      setInputText(originalText);
      setFailedMessage(originalText);
      onError?.(message);
    } finally {
      setSending(false);
    }
  }, [
    api,
    course,
    inputText,
    maxMessages,
    messages,
    onError,
    onMessageSent,
    sending,
    sessionState,
  ]);

  const deleteSession = useCallback(async () => {
    if (!sessionId || deleting) return;
    setDeleting(true);
    try {
      await aiApi(api).deleteChatSession(sessionId);
      setMessages([]);
      setSessionId(null);
      setInputText('');
      setFailedMessage(null);
      await loadSession();
    } catch (error) {
      onError?.(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }, [api, deleting, loadSession, onError, sessionId]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Clear this conversation?',
      'This permanently deletes the saved chat history for this course.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear chat', style: 'destructive', onPress: deleteSession },
      ]
    );
  }, [deleteSession]);

  const canSend = useMemo(
    () => inputText.trim().length > 0 && !sending && sessionState === 'ready',
    [inputText, sending, sessionState]
  );

  if (sessionState === 'loading') {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size='large' color='#C4FF0E' />
        <Text style={styles.stateTitle}>Loading saved conversation…</Text>
      </View>
    );
  }

  if (sessionState === 'error') {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateTitle}>Chat history could not be loaded</Text>
        <Text style={styles.stateText}>{sessionError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSession}>
          <RefreshCw size={16} color='#111' />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.toolbar}>
        <Text style={styles.savedText}>
          {sessionId ? 'History saved' : 'Starting conversation'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={30} color='#C4FF0E' />
            <Text style={styles.emptyTitle}>Ask about {course.courseCode}</Text>
            <Text style={styles.emptyText}>
              Replies come from the course AI service and this conversation is
              saved to your account.
            </Text>
          </View>
        ) : null}
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.isUser ? styles.userText : styles.assistantText,
              ]}
            >
              {message.text}
            </Text>
            {message.timestamp ? (
              <Text style={styles.messageTime}>{message.timestamp}</Text>
            ) : null}
          </View>
        ))}
        {sending ? (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator size='small' color='#C4FF0E' />
            <Text style={styles.assistantText}>Thinking…</Text>
          </View>
        ) : null}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActions}
        style={styles.quickActionsScroller}
        keyboardShouldPersistTaps='handled'
      >
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setInputText('Explain the main topics in this course')}
        >
          <BookOpen size={14} color='#C4FF0E' />
          <Text style={styles.quickActionText}>Main topics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setInputText('Give me a study plan for this course')}
        >
          <Lightbulb size={14} color='#C4FF0E' />
          <Text style={styles.quickActionText}>Study plan</Text>
        </TouchableOpacity>
      </ScrollView>

      {failedMessage ? (
        <Text style={styles.sendError}>
          Message not sent. Your text was restored so you can retry.
        </Text>
      ) : null}
      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          style={[styles.input, failedMessage ? styles.inputError : null]}
          value={inputText}
          onChangeText={text => {
            setInputText(text.slice(0, 500));
            if (text !== failedMessage) setFailedMessage(null);
          }}
          placeholder={`Ask about ${course.courseCode}…`}
          placeholderTextColor='#777'
          multiline
          editable={!deleting}
          maxLength={500}
          returnKeyType='send'
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel='Send message'
          {...(Platform.OS === 'web' ? ({ onMouseDown: (e: any) => e.preventDefault() } as any) : {})}
        >
          <Send size={18} color={canSend ? '#111' : '#666'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#1A1A2E',
  },
  stateTitle: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: { color: '#AAAAC0', marginTop: 7, textAlign: 'center' },
  retryButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#C4FF0E',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#111', fontWeight: '800' },
  toolbar: {
    minHeight: 38,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedText: { color: '#8D8DA8', fontSize: 12, fontWeight: '600' },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
  },
  clearText: { color: '#FF8A80', fontSize: 12, fontWeight: '700' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: {
    color: '#AAAAC0',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  messageBubble: {
    maxWidth: '86%',
    padding: 13,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#C4FF0E' },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#252540',
    borderWidth: 1,
    borderColor: '#3A3A55',
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#111' },
  assistantText: { color: '#F1F1FA' },
  messageTime: { color: '#77778F', fontSize: 10, marginTop: 6 },
  quickActionsScroller: { flexGrow: 0, maxHeight: 50 },
  quickActions: { paddingHorizontal: 12, paddingVertical: 7, gap: 8 },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#3A3A55',
    borderRadius: 18,
    paddingHorizontal: 12,
    backgroundColor: '#252540',
  },
  quickActionText: { color: '#E9E9F5', fontSize: 12, fontWeight: '700' },
  sendError: {
    color: '#FF8A80',
    fontSize: 11,
    paddingHorizontal: 16,
    paddingTop: 5,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A45',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    color: '#fff',
    backgroundColor: '#252540',
    borderWidth: 1,
    borderColor: '#3A3A55',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: { borderColor: '#FF8A80' },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C4FF0E',
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2A40',
    opacity: 0.4,
  },
});
