import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  TextInput,
  Dimensions,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CornerUpRight,
  Send,
  X,
  MessageCircle,
  ArrowLeft,
  User,
  MoreVertical,
  Calendar,
} from 'lucide-react-native';
import { forumApi, useApi, ForumCommentNode, QuestionDetail, Answer } from '@/utils/api';

export default function PostDetailScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const api = useApi();
  const forumClient = useMemo(() => forumApi(api), [api]);

  // State
  const [post, setPost] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; author?: string } | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [repliesByAnswer, setRepliesByAnswer] = useState<Record<string, {
    items: ForumCommentNode[];
    loading: boolean;
    error?: string | null;
    expanded: boolean;
  }>>({});
  const replyInputRef = useRef<TextInput | null>(null);

  // Helpers
  const getName = useCallback((u?: { name?: string; fullname?: string } | null) => {
    return u?.fullname ?? u?.name ?? 'Anonymous';
  }, []);
  const formatDate = useCallback((d?: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  }, []);



  const handleDeletePost = useCallback(async () => {
    if (!post?.id) return;
    
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await forumClient.deleteQuestion(post.id);
              Alert.alert('Success', 'Post deleted successfully');
              router.back();
            } catch (error) {
              console.error('Failed to delete post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  }, [post?.id, forumClient, router]);

  const handleDeleteAnswer = useCallback(async (answerId: string) => {
    Alert.alert(
      'Delete Answer',
      'Are you sure you want to delete this answer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await forumClient.deleteAnswer(answerId);
              // Update post state to remove the deleted answer
              setPost(prevPost => {
                if (!prevPost) return null;
                return {
                  ...prevPost,
                  answers: prevPost.answers.filter(answer => answer.id !== answerId),
                  _count: {
                    ...prevPost._count,
                    answers: prevPost._count.answers - 1
                  }
                };
              });
              Alert.alert('Success', 'Answer deleted successfully');
            } catch (error) {
              console.error('Failed to delete answer:', error);
              Alert.alert('Error', 'Failed to delete answer. Please try again.');
            }
          },
        },
      ]
    );
  }, [forumClient]);

  // Fetch post with retry logic
  const fetchPost = useCallback(async (questionId: string, retryCount: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const res = await forumClient.getQuestion(questionId);
      setPost(res?.data ?? null);
    } catch (e: any) {
      console.error('Failed to load post:', e);
      
      // Handle rate limiting
      if (e.status === 429 && retryCount < 3) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`⏰ Post fetch rate limited. Retrying in ${delayMs}ms`);
        
        setTimeout(() => {
          fetchPost(questionId, retryCount + 1);
        }, delayMs);
        return;
      }
      
      const errorMessage = e.status === 429 
        ? 'Too many requests. Please wait a moment and try again.'
        : e?.message || 'Failed to load post';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [forumClient]);

  // Fetch post
  useEffect(() => {
    if (!id) return;
    const questionId = Array.isArray(id) ? id[0] : id;
    fetchPost(questionId);
  }, [id, fetchPost]);

  // State for new answer
  const [newAnswerBody, setNewAnswerBody] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);

  // Submit new answer to question
  const submitAnswer = async () => {
    if (!post?.id || !newAnswerBody.trim() || submittingAnswer) return;
    try {
      setSubmittingAnswer(true);
      const res = await forumClient.addAnswer(post.id, {
        body: newAnswerBody.trim(),
        isAnonymous: false,
      });
      
      const newAnswer = (res as any)?.data ?? {
        id: String(Date.now()),
        body: newAnswerBody.trim(),
        createdAt: new Date().toISOString(),
        author: { id: 'current-user', fullname: 'You', email: '' },
        status: 'Pending' as const,
        _count: { comments: 0 },
      };
      
      // Add new answer to post
      setPost(prevPost => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          answers: [...prevPost.answers, newAnswer],
          _count: {
            ...prevPost._count,
            answers: prevPost._count.answers + 1
          }
        };
      });
      
      setNewAnswerBody('');
      setShowAnswerInput(false);
      Alert.alert('Success', 'Your answer has been posted!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Submit reply to answer
  const submitReply = async () => {
    if (!replyingTo || !replyBody.trim() || submittingReply) return;
    try {
      setSubmittingReply(true);
      const res = await forumClient.addComment({
        body: replyBody.trim(),
        answerId: replyingTo.id,
        isAnonymous: false,
      });
      
      const newReply = (res as any)?.data ?? {
        id: String(Date.now()),
        body: replyBody.trim(),
        createdAt: new Date().toISOString(),
        author: { id: 'current-user', fullname: 'You', email: '' },
        answerId: replyingTo.id,
        replies: [],
      };
      
      // Update the replies state
      setRepliesByAnswer(prev => {
        const currentReplies = prev[replyingTo.id] || { items: [], loading: false, error: null, expanded: true };
        const existingItems = Array.isArray(currentReplies.items) ? currentReplies.items : [];
        return {
          ...prev,
          [replyingTo.id]: {
            ...currentReplies,
            items: [...existingItems, newReply],
            expanded: true
          }
        };
      });
      
      setReplyingTo(null);
      setReplyBody('');
      Alert.alert('Success', 'Your reply has been posted!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const toggleReplies = useCallback(async (answerId: string) => {
    setRepliesByAnswer(prev => {
      const cur = prev[answerId];
      if (!cur) {
        // First open: set expanded and loading, then fetch
        return { ...prev, [answerId]: { items: [], loading: true, error: null, expanded: true } };
      }
      // Toggle expanded
      return { ...prev, [answerId]: { ...cur, expanded: !cur.expanded } };
    });

    if (!repliesByAnswer[answerId]) {
      try {
        const res = await forumClient.getAnswerComments(answerId);
        setRepliesByAnswer(prev => ({
          ...prev,
          [answerId]: { items: Array.isArray(res) ? res : [], loading: false, error: null, expanded: true },
        }));
      } catch (e: any) {
        setRepliesByAnswer(prev => ({
          ...prev,
          [answerId]: { items: [], loading: false, error: e?.message || 'Failed to load replies', expanded: true },
        }));
      }
    }
  }, [forumClient, repliesByAnswer]);

  const renderCommentNode = useCallback((node: ForumCommentNode, depth = 0) => (
    <View key={node.id} style={[styles.replyItem, depth > 0 && { marginLeft: depth * 12 }]}>
      <Text style={styles.replyAuthor}>{getName(node.author as any)}</Text>
      <Text style={styles.replyBody}>{node.body}</Text>
      {Array.isArray(node.replies) && node.replies.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {node.replies.map(child => renderCommentNode(child, depth + 1))}
        </View>
      )}
    </View>
  ), [getName]);



  const renderAnswer = useCallback((answer: Answer) => {
    const replyState = repliesByAnswer[answer.id];

    return (
      <View key={answer.id} style={styles.answerCard}>
        <View style={styles.answerHeader}>
          <Text style={styles.answerAuthor}>{getName(answer.author)}</Text>
          <Text style={styles.answerDate}>{formatDate(answer.createdAt)}</Text>
        </View>
        <Text style={styles.answerBody}>{answer.body}</Text>

        <View style={styles.answerActionsRow}>
          <TouchableOpacity
            onPress={() => toggleReplies(answer.id)}
            activeOpacity={0.8}
            style={styles.replyCountBadge}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MessageCircle size={12} color="#6b7280" />
            <Text style={styles.replyCountText}>
              {typeof answer?._count?.comments === 'number' ? answer._count.comments : 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              // Ensure replies section is expanded when starting to reply
              setRepliesByAnswer(prev => ({
                ...prev,
                [answer.id]: {
                  ...prev[answer.id],
                  expanded: true
                }
              }));
              setReplyingTo({ id: answer.id, author: getName(answer.author) });
              setTimeout(() => replyInputRef.current?.focus(), 150);
            }}
            activeOpacity={0.8}
            style={styles.replyButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <CornerUpRight size={12} color="#4f46e5" />
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>

        {/* Replies panel */}
        {replyState?.expanded && (
          <View style={styles.repliesContainer}>
            {replyState.loading && (
              <View style={styles.repliesLoadingRow}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.repliesLoadingText}>Loading replies…</Text>
              </View>
            )}

            {!!replyState.error && (
              <TouchableOpacity onPress={() => toggleReplies(answer.id)} style={styles.repliesErrorRow}>
                <Text style={styles.repliesErrorText}>{replyState.error} — Tap to retry</Text>
              </TouchableOpacity>
            )}

            {!replyState.loading && !replyState.error && Array.isArray(replyState.items) && replyState.items.length === 0 && (
              <Text style={styles.emptyRepliesText}>No replies yet.</Text>
            )}

            {Array.isArray(replyState.items) && replyState.items.map(node => renderCommentNode(node, 0))}

            {/* Inline composer shown under this answer if replying */}
            {replyingTo?.id === answer.id && (
              <View style={styles.replyComposer}>
                <TextInput
                  ref={replyInputRef}
                  style={styles.replyTextInput}
                  placeholder="Write your reply…"
                  value={replyBody}
                  onChangeText={setReplyBody}
                  multiline
                  textAlignVertical="top"
                  returnKeyType="send"
                  onSubmitEditing={submitReply}
                />
                <TouchableOpacity
                  onPress={submitReply}
                  disabled={!replyBody.trim() || submittingReply}
                  style={[styles.sendBtn, (!replyBody.trim() || submittingReply) && { opacity: 0.6 }]}
                >
                  <Send size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyClose}>
                  <X size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [repliesByAnswer, setReplyingTo, replyBody, submittingReply, submitReply, replyingTo, renderCommentNode, toggleReplies, getName]);

  // UI
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" />
        <Text style={styles.muted}>Loading post…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace(`/post/${id}`)} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Post not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Discussion
          </Text>
          <TouchableOpacity style={styles.moreButton} onPress={handleDeletePost}>
            <MoreVertical size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <User size={14} color="#6b7280" />
            <Text style={styles.metaText}>{getName(post.author)}</Text>
          </View>
          {!!post.createdAt && (
            <View style={styles.metaItem}>
              <Calendar size={14} color="#6b7280" />
              <Text style={styles.metaText}>{formatDate(post.createdAt)}</Text>
            </View>
          )}
         
        </View>
        <Text style={styles.body}>{post.body}</Text>
        
        {/* Answer Input Section */}
        <View style={styles.answerSection}>
          <View style={styles.answerSectionHeader}>
            <Text style={styles.sectionTitle}>Answers ({post.answers?.length ?? 0})</Text>
            <TouchableOpacity 
              style={styles.addAnswerButton}
              onPress={() => setShowAnswerInput(!showAnswerInput)}
            >
              <Text style={styles.addAnswerText}>
                {showAnswerInput ? 'Cancel' : 'Add Answer'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showAnswerInput && (
            <View style={styles.newAnswerContainer}>
              <TextInput
                style={styles.newAnswerInput}
                placeholder="Write your answer here..."
                value={newAnswerBody}
                onChangeText={setNewAnswerBody}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <View style={styles.answerActions}>
                <Text style={styles.characterCount}>
                  {newAnswerBody.length}/2000
                </Text>
                <TouchableOpacity
                  style={[
                    styles.submitAnswerButton,
                    (!newAnswerBody.trim() || submittingAnswer) && styles.submitAnswerButtonDisabled
                  ]}
                  onPress={submitAnswer}
                  disabled={!newAnswerBody.trim() || submittingAnswer}
                >
                  {submittingAnswer ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitAnswerButtonText}>Post Answer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {post.answers?.map(ans => renderAnswer(ans))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 52, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  backButton: { marginRight: 8, padding: 4, borderRadius: 8, backgroundColor: '#4f46e5' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#fff' },
  moreButton: { marginLeft: 8, padding: 4, borderRadius: 8, backgroundColor: '#4f46e5' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#6b7280', fontSize: 12 },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbe3ff',
  },
  categoryText: { color: '#4f46e5', fontSize: 12, fontWeight: '700' },
  body: { color: '#374151', fontSize: 14, lineHeight: 20, marginTop: 8 },
  sectionTitle: { color: '#111827', fontWeight: '800', marginTop: 16 },
  answerCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#eef2f7',
    gap: 8,
  },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerAuthor: { color: '#111827', fontWeight: '700', fontSize: 13 },
  answerDate: { color: '#6b7280', fontSize: 12 },
  answerBody: { color: '#374151', fontSize: 14, lineHeight: 20 },
  replyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbe3ff',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  replyChipText: { color: '#4f46e5', fontWeight: '700', fontSize: 12 },
  replyComposer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyTextInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  replyClose: { padding: 4, borderRadius: 6, backgroundColor: '#f3f4f6' },
  repliesContainer: {
    marginTop: 10,
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
    paddingLeft: 12,
    gap: 8,
  },
  replyItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 6,
  },
  replyAuthor: { fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 4 },
  replyBody: { fontSize: 13, color: '#374151', lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: '#6b7280' },
  error: { color: '#dc2626', fontWeight: '700' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbe3ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: { color: '#4f46e5', fontWeight: '700' },
  answerActionsRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 8 },
  replyCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbe3ff',
  },
  replyCountText: { color: '#374151', fontSize: 12 },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginLeft: 8,
  },
  replyButtonText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
  repliesLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  repliesLoadingText: { color: '#374151', fontSize: 12 },
  repliesErrorRow: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginTop: 8,
  },
  repliesErrorText: { color: '#dc2626', fontSize: 12, textAlign: 'center' },
  emptyRepliesText: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 8 },
  
  // Answer input section styles
  answerSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  answerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addAnswerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbe3ff',
  },
  addAnswerText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
  newAnswerContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  newAnswerInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 100,
    maxHeight: 200,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  answerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  submitAnswerButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  submitAnswerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitAnswerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

});