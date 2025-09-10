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
import { forumApi, useApi, ForumCommentNode } from '@/utils/api';

export default function PostDetailScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const api = useApi();
  const forumClient = useMemo(() => forumApi(api), [api]);

  // State
  const [post, setPost] = useState(null);
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
  const getCategoryLabel = useCallback((c?: { name?: string; title?: string } | string | null) => {
    return typeof c === 'string' ? c : (c?.name ?? c?.title ?? 'Uncategorized');
  }, []);
  const formatDate = useCallback((d?: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  }, []);

  // Fetch post
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    forumClient.getQuestion(id)
      .then(res => setPost(res?.data ?? null))
      .catch(e => setError(e?.message || 'Failed to load post'))
      .finally(() => setLoading(false));
  }, [id, forumClient]);

  // Submit reply
  const submitReply = async () => {
    if (!replyingTo || !replyBody.trim() || submittingReply) return;
    try {
      setSubmittingReply(true);
      const res = await forumClient.replyToAnswer({
        answerId: replyingTo.id,
        body: replyBody.trim(),
      });
      const newReply = res?.data ?? {
        id: String(Date.now()),
        body: replyBody.trim(),
        createdAt: new Date().toISOString(),
        author: { fullname: 'You' },
      };
      setPost(prevPost => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          answers: prevPost.answers.map(a =>
            a.id === replyingTo.id
              ? { ...a, replies: [ ...(a.replies || []), newReply ] }
              : a
          ),
        };
      });
      setReplyingTo(null);
      setReplyBody('');
    } catch (e) {
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
          [answerId]: { items: res?.data ?? [], loading: false, error: null, expanded: true },
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
            onPress={() => setReplyingTo({ id: answer.id, author: getName(answer.author) })}
            activeOpacity={0.8}
            style={styles.replyChip}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <CornerUpRight size={14} color="#4f46e5" />
            <Text style={styles.replyChipText}>Reply</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleReplies(answer.id)}
            activeOpacity={0.8}
            style={styles.replyCountBadge}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MessageCircle size={12} color="#6b7280" />
            <Text style={styles.replyCountText}>
              {replyState?.expanded ? 'Hide' : 'View'} replies
              {typeof answer?._count?.comments === 'number' ? ` (${answer._count.comments})` : ''}
            </Text>
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

            {!replyState.loading && !replyState.error && replyState.items?.length === 0 && (
              <Text style={styles.emptyRepliesText}>No replies yet.</Text>
            )}

            {replyState.items?.map(node => renderCommentNode(node, 0))}

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
        <TouchableOpacity onPress={() => router.replace(router.asPath || `/post/${id}`)} style={styles.retryBtn}>
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
          {!!post.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{getCategoryLabel(post.category)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.body}>{post.body}</Text>
        <Text style={styles.sectionTitle}>Answers ({post.answers?.length ?? 0})</Text>
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
  answerActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
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
});