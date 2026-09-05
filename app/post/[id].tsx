import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  ActivityIndicator,
  TextInput,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CornerUpRight,
  Send,
  X,
  MessageCircle,
  ArrowLeft,
  Trash2,
  Share2,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react-native';
import {
  forumApi,
  likesApi,
  useApi,
  ForumCommentNode,
  QuestionDetail,
  Answer,
} from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { canManageForumContent } from '@/utils/forum';
import { lightTheme } from '@/constants/theme';

const AVATAR_COLORS = [
  '#7B2FBE',
  '#DB2777',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function initials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export default function PostDetailScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const questionId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const api = useApi();
  const forumClient = useMemo(() => forumApi(api), [api]);
  const likesClient = useMemo(() => likesApi(api), [api]);
  const insets = useSafeAreaInsets();

  // State
  const [post, setPost] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Reply Composer State
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
    type: 'answer' | 'comment';
  } | null>(null);

  // Emoji Reactions State (Optimistic)
  const [questionReactions, setQuestionReactions] = useState<{
    counts: Record<string, number>;
    userReacted?: string;
  }>({ counts: {} });

  // Sync post reaction count when post loads
  useEffect(() => {
    if (post) {
      const baseCount = post.reactionCount ?? post.score ?? 0;
      setQuestionReactions(prev => ({
        counts: {
          ...prev.counts,
          ...(baseCount > 0 ? { '❤️': baseCount } : {}),
        },
        userReacted: post.isLiked ? '❤️' : prev.userReacted,
      }));
    }
  }, [post?.id, post?.reactionCount, post?.score, post?.isLiked]);

  const [answerReactions, setAnswerReactions] = useState<
    Record<string, { counts: Record<string, number>; userReacted?: string }>
  >({});

  // Replies map for shallow tree
  const [repliesByAnswer, setRepliesByAnswer] = useState<
    Record<
      string,
      {
        items: ForumCommentNode[];
        loading: boolean;
        error?: string | null;
        expanded: boolean;
      }
    >
  >({});

  // Deep comment branches expanded
  const [expandedDeepNodes, setExpandedDeepNodes] = useState<
    Record<string, boolean>
  >({});

  const replyInputRef = useRef<TextInput | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchGenerationRef = useRef(0);

  const getName = useCallback(
    (u?: { name?: string; fullname?: string } | null) => {
      return u?.fullname ?? u?.name ?? 'Anonymous';
    },
    []
  );

  // Fetch post with retry logic
  const fetchPost = useCallback(
    async (qid: string, retryCount: number = 0) => {
      const generation = ++fetchGenerationRef.current;
      let retryScheduled = false;

      try {
        setLoading(true);
        setError(null);
        const res = await forumClient.getQuestion(qid);
        if (generation !== fetchGenerationRef.current) return;
        setPost(res?.data ?? null);
      } catch (e: any) {
        if (e.status === 429 && retryCount < 3) {
          const delayMs = Math.pow(2, retryCount) * 1000;
          retryScheduled = true;
          retryTimerRef.current = setTimeout(() => {
            fetchPost(qid, retryCount + 1);
          }, delayMs);
          return;
        }

        if (generation !== fetchGenerationRef.current) return;
        const errorMessage =
          e.status === 429
            ? 'Too many requests. Please wait a moment and try again.'
            : e?.message || 'Failed to load post';
        setError(errorMessage);
      } finally {
        if (!retryScheduled && generation === fetchGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [forumClient]
  );

  useEffect(() => {
    if (!questionId) return;
    fetchPost(questionId);

    return () => {
      fetchGenerationRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [questionId, fetchPost]);

  // Reactions Handler with real backend like sync
  const handleReactQuestion = async (emoji: string) => {
    if (!post?.id) return;
    const isCurrentlyReacted = questionReactions.userReacted === emoji;
    const nextReacted = !isCurrentlyReacted;
    const curCount = questionReactions.counts[emoji] || 0;

    // Optimistic update
    setQuestionReactions(prev => ({
      counts: {
        ...prev.counts,
        [emoji]: nextReacted ? curCount + 1 : Math.max(0, curCount - 1),
      },
      userReacted: nextReacted ? emoji : undefined,
    }));

    try {
      if (nextReacted) {
        await likesClient.like('Question', post.id);
      } else {
        await likesClient.unlike('Question', post.id);
      }
    } catch {
      // Rollback on failure
      setQuestionReactions(prev => ({
        counts: {
          ...prev.counts,
          [emoji]: isCurrentlyReacted ? curCount + 1 : Math.max(0, curCount - 1),
        },
        userReacted: isCurrentlyReacted ? emoji : undefined,
      }));
    }
  };

  const handleReactAnswer = (answerId: string, emoji: string) => {
    setAnswerReactions(prev => {
      const current = prev[answerId] || { counts: {} };
      const already = current.userReacted === emoji;
      const count = current.counts[emoji] || 0;
      return {
        ...prev,
        [answerId]: {
          ...current,
          counts: {
            ...current.counts,
            [emoji]: already ? Math.max(0, count - 1) : count + 1,
          },
          userReacted: already ? undefined : emoji,
        },
      };
    });
  };

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/forum');
    }
  }, [router]);

  // Delete Post
  const handleDeletePost = useCallback(async () => {
    if (!post?.id) return;
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this discussion? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await forumClient.deleteQuestion(post.id);
              Alert.alert('Deleted', 'Discussion deleted successfully.');
              handleBack();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete post.');
            }
          },
        },
      ]
    );
  }, [post?.id, forumClient, handleBack]);

  // Delete Answer
  const handleDeleteAnswer = useCallback(
    async (answerId: string) => {
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
                setPost(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    answers: prev.answers.filter(a => a.id !== answerId),
                    _count: {
                      answers: Math.max(0, (prev._count?.answers || 1) - 1),
                    },
                  };
                });
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Failed to delete answer.');
              }
            },
          },
        ]
      );
    },
    [forumClient]
  );

  // Toggle Answers' Replies
  const toggleReplies = useCallback(
    async (answerId: string) => {
      setRepliesByAnswer(prev => {
        const cur = prev[answerId];
        if (!cur) {
          return {
            ...prev,
            [answerId]: {
              items: [],
              loading: true,
              error: null,
              expanded: true,
            },
          };
        }
        return {
          ...prev,
          [answerId]: { ...cur, expanded: !cur.expanded },
        };
      });

      if (!repliesByAnswer[answerId]) {
        try {
          const res = await forumClient.getAnswerComments(answerId);
          const items = Array.isArray(res)
            ? res
            : Array.isArray((res as any)?.data)
            ? (res as any).data
            : [];
          setRepliesByAnswer(prev => ({
            ...prev,
            [answerId]: {
              items,
              loading: false,
              error: null,
              expanded: true,
            },
          }));
        } catch (e: any) {
          setRepliesByAnswer(prev => ({
            ...prev,
            [answerId]: {
              items: [],
              loading: false,
              error: e?.message || 'Failed to load replies',
              expanded: true,
            },
          }));
        }
      }
    },
    [forumClient, repliesByAnswer]
  );

  // Submit Answer or Comment
  const handleSubmit = async () => {
    if (!inputText.trim() || submitting || !post?.id) return;
    setSubmitting(true);

    try {
      if (replyingTo) {
        // Post a comment/reply
        const isCommentReply = replyingTo.type === 'comment';
        const res = await forumClient.addComment({
          body: inputText.trim(),
          ...(isCommentReply
            ? { parentId: replyingTo.id }
            : { answerId: replyingTo.id }),
        });

        const newComment: ForumCommentNode = (res as any)?.data ?? {
          id: String(Date.now()),
          body: inputText.trim(),
          createdAt: new Date().toISOString(),
          author: {
            id: user?.id || 'me',
            fullname: user?.fullname || 'You',
            department: user?.department,
            level: user?.level,
          },
          replies: [],
        };

        // If replying to answer, append to answer's replies
        const answerTargetId = isCommentReply ? post.answers[0]?.id : replyingTo.id;
        if (answerTargetId) {
          setRepliesByAnswer(prev => {
            const current = prev[answerTargetId] || {
              items: [],
              loading: false,
              expanded: true,
            };
            return {
              ...prev,
              [answerTargetId]: {
                ...current,
                items: [...current.items, newComment],
                expanded: true,
              },
            };
          });
        }
        setReplyingTo(null);
      } else {
        // Post a top-level Answer
        const res = await forumClient.addAnswer(post.id, {
          body: inputText.trim(),
          isAnonymous: false,
        });

        const newAnswer: Answer = (res as any)?.data ?? {
          id: String(Date.now()),
          body: inputText.trim(),
          questionId: post.id,
          createdAt: new Date().toISOString(),
          author: {
            id: user?.id || 'me',
            fullname: user?.fullname || 'You',
            department: user?.department,
            level: user?.level,
          },
          _count: { comments: 0 },
        };

        setPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            answers: [...(prev.answers || []), newAnswer],
            _count: {
              answers: (prev._count?.answers || 0) + 1,
            },
          };
        });
      }

      setInputText('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  };

  // Shallow Comment Node Renderer (Max 2 visible levels)
  const renderCommentNode = useCallback(
    (node: ForumCommentNode, depth = 0) => {
      const authorName = getName(node.author as any);
      const bgColor = avatarColor(authorName);
      const abbr = initials(authorName);
      const peerTag = node.author?.department
        ? `${node.author.department}${
            node.author.level ? ` • ${node.author.level}L` : ''
          }`
        : null;

      const hasReplies =
        Array.isArray(node.replies) && node.replies.length > 0;
      const isDeep = depth >= 1;
      const isExpanded = !!expandedDeepNodes[node.id];

      return (
        <View
          key={node.id}
          style={[
            styles.commentItem,
            depth > 0 && styles.commentItemNested,
          ]}
        >
          {/* Comment Author Header */}
          <View style={styles.commentHeader}>
            <View style={[styles.avatarSmall, { backgroundColor: bgColor }]}>
              <Text style={styles.avatarTextSmall}>{abbr}</Text>
            </View>
            <View style={styles.commentAuthorMeta}>
              <View style={styles.authorNameRow}>
                <Text style={styles.commentAuthorName}>{authorName}</Text>
                {peerTag && (
                  <View style={styles.peerBadgeSmall}>
                    <Text style={styles.peerBadgeSmallText}>{peerTag}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentDate}>
                {formatRelativeTime(node.createdAt)}
              </Text>
            </View>
          </View>

          {/* Comment Body */}
          <Text style={styles.commentBody}>{node.body}</Text>

          {/* Reply Affordance */}
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => {
                setReplyingTo({
                  id: node.id,
                  authorName,
                  type: 'comment',
                });
                replyInputRef.current?.focus();
              }}
              style={styles.inlineReplyButton}
              activeOpacity={0.7}
            >
              <CornerUpRight size={11} color='#7B2FBE' />
              <Text style={styles.inlineReplyText}>Reply</Text>
            </TouchableOpacity>
          </View>

          {/* Shallow Threading Cap: If deeper than level 1, collapse behind accordion */}
          {hasReplies && (
            <View style={styles.nestedContainer}>
              {isDeep && !isExpanded ? (
                <TouchableOpacity
                  style={styles.expandDeepBtn}
                  onPress={() =>
                    setExpandedDeepNodes(p => ({
                      ...p,
                      [node.id]: true,
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <ChevronDown size={13} color='#7B2FBE' />
                  <Text style={styles.expandDeepText}>
                    View {node.replies!.length} more{' '}
                    {node.replies!.length === 1 ? 'reply' : 'replies'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {node.replies!.map(child =>
                    renderCommentNode(child, depth + 1)
                  )}
                  {isDeep && isExpanded && (
                    <TouchableOpacity
                      style={styles.collapseDeepBtn}
                      onPress={() =>
                        setExpandedDeepNodes(p => ({
                          ...p,
                          [node.id]: false,
                        }))
                      }
                      activeOpacity={0.8}
                    >
                      <ChevronUp size={13} color='#6B7280' />
                      <Text style={styles.collapseDeepText}>
                        Hide replies
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      );
    },
    [getName, expandedDeepNodes]
  );

  // Render Single Answer
  const renderAnswer = useCallback(
    (answer: Answer) => {
      const authorName = getName(answer.author);
      const bgColor = avatarColor(authorName);
      const abbr = initials(authorName);
      const peerTag = answer.author?.department
        ? `${answer.author.department}${
            answer.author.level ? ` • ${answer.author.level}L` : ''
          }`
        : null;

      const replyState = repliesByAnswer[answer.id];
      const canManage = canManageForumContent(user, answer.authorId);
      const commentCount =
        typeof answer?._count?.comments === 'number'
          ? answer._count.comments
          : replyState?.items?.length || 0;

      return (
        <View key={answer.id} style={styles.answerCard}>
          {/* Answer Author Header */}
          <View style={styles.answerAuthorHeader}>
            <View style={styles.authorInfoLeft}>
              <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                <Text style={styles.avatarText}>{abbr}</Text>
              </View>
              <View style={styles.authorDetails}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{authorName}</Text>
                  {peerTag && (
                    <View style={styles.peerBadge}>
                      <Text style={styles.peerBadgeText}>{peerTag}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.postMetaText}>
                  {formatRelativeTime(answer.createdAt)}
                </Text>
              </View>
            </View>

            {canManage && (
              <TouchableOpacity
                style={styles.deleteMiniBtn}
                onPress={() => handleDeleteAnswer(answer.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={13} color='#EF4444' />
              </TouchableOpacity>
            )}
          </View>

          {/* Answer Body */}
          <Text style={styles.answerBody}>{answer.body}</Text>

          {/* Answer Engagement Bar */}
          <View style={styles.answerActionsRow}>
            {/* Quick React Emojis */}
            <View style={styles.emojiReactionRow}>
              {['🔥', '💡', '❤️', '👏'].map(emoji => {
                const active =
                  answerReactions[answer.id]?.userReacted === emoji;
                const count =
                  answerReactions[answer.id]?.counts?.[emoji] || 0;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiPill,
                      active && styles.emojiPillActive,
                    ]}
                    onPress={() => handleReactAnswer(answer.id, emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiIcon}>{emoji}</Text>
                    {count > 0 && (
                      <Text
                        style={[
                          styles.emojiCount,
                          active && styles.emojiCountActive,
                        ]}
                      >
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Replies Toggle & Quick Reply CTA */}
            <View style={styles.answerRightActions}>
              <TouchableOpacity
                onPress={() => toggleReplies(answer.id)}
                activeOpacity={0.8}
                style={styles.replyCountBadge}
              >
                <MessageCircle size={13} color='#7B2FBE' />
                <Text style={styles.replyCountText}>
                  {commentCount}{' '}
                  {commentCount === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setRepliesByAnswer(p => ({
                    ...p,
                    [answer.id]: {
                      ...(p[answer.id] || { items: [] }),
                      expanded: true,
                    },
                  }));
                  setReplyingTo({
                    id: answer.id,
                    authorName,
                    type: 'answer',
                  });
                  replyInputRef.current?.focus();
                }}
                activeOpacity={0.8}
                style={styles.quickReplyBtn}
              >
                <CornerUpRight size={12} color='#7B2FBE' />
                <Text style={styles.quickReplyBtnText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible Replies List */}
          {replyState?.expanded && (
            <View style={styles.repliesSection}>
              {replyState.loading && (
                <View style={styles.repliesLoadingRow}>
                  <ActivityIndicator size='small' color='#7B2FBE' />
                  <Text style={styles.repliesLoadingText}>
                    Loading responses…
                  </Text>
                </View>
              )}

              {replyState.error && (
                <TouchableOpacity
                  onPress={() => toggleReplies(answer.id)}
                  style={styles.repliesErrorRow}
                >
                  <Text style={styles.repliesErrorText}>
                    {replyState.error} — Tap to retry
                  </Text>
                </TouchableOpacity>
              )}

              {!replyState.loading &&
                !replyState.error &&
                replyState.items.length === 0 && (
                  <Text style={styles.emptyRepliesText}>
                    No responses yet. Share your thoughts above!
                  </Text>
                )}

              {replyState.items.map(node => renderCommentNode(node, 0))}
            </View>
          )}
        </View>
      );
    },
    [
      getName,
      user,
      handleDeleteAnswer,
      answerReactions,
      repliesByAnswer,
      toggleReplies,
      renderCommentNode,
    ]
  );

  // Loading View
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#7B2FBE' />
        <Text style={styles.loadingText}>Opening discussion…</Text>
      </SafeAreaView>
    );
  }

  // Error View
  if (error || !post) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || 'Discussion not found.'}</Text>
        <TouchableOpacity
          onPress={() => fetchPost(questionId)}
          style={styles.retryBtn}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const authorName = getName(post.author);
  const bgColor = avatarColor(authorName);
  const abbr = initials(authorName);
  const peerTag = post.author?.department || post.department;
  const levelTag = post.author?.level ? ` • ${post.author.level}L` : '';
  const views =
    post.viewCount ||
    post.views ||
    Math.max(1, Math.floor(((post.score || 1) * 9) % 45) + 5);
  const canManagePost = canManageForumContent(user, post.authorId);
  const answersCount = post.answers?.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color='#0D0D0D' strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Discussion
        </Text>
        {canManagePost ? (
          <TouchableOpacity
            style={styles.deleteTopBtn}
            onPress={handleDeletePost}
            activeOpacity={0.8}
          >
            <Trash2 size={18} color='#EF4444' strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* ── Main Question Card ── */}
          <View style={styles.questionCard}>
            {/* Author Row */}
            <View style={styles.authorHeaderRow}>
              <View style={styles.authorInfoLeft}>
                <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                  <Text style={styles.avatarText}>{abbr}</Text>
                </View>
                <View style={styles.authorDetails}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{authorName}</Text>
                    {peerTag && (
                      <View style={styles.peerBadge}>
                        <Text style={styles.peerBadgeText}>
                          {peerTag}
                          {levelTag}
                        </Text>
                      </View>
                    )}
                    {post.courseCode ? (
                      <View style={styles.courseTagBadge}>
                        <BookOpen size={10} color='#0D0D0D' />
                        <Text style={styles.courseTagBadgeText} numberOfLines={1}>
                          {post.courseCode}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.postMetaText}>
                    {formatRelativeTime(post.createdAt)} • 👀 {views} view
                    {views !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Title & Body */}
            <Text style={styles.questionTitle}>{post.title}</Text>
            <Text style={styles.questionBody}>{post.body}</Text>

            {/* Quick Reactions Bar on Question */}
            <View style={styles.questionReactionBar}>
              <Text style={styles.reactionPrompt}>React:</Text>
              <View style={styles.emojiReactionRow}>
                {['🔥', '💡', '❤️', '👏', '😂'].map(emoji => {
                  const active = questionReactions.userReacted === emoji;
                  const count = questionReactions.counts?.[emoji] || 0;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiPillLarge,
                        active && styles.emojiPillActive,
                      ]}
                      onPress={() => handleReactQuestion(emoji)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiIconLarge}>{emoji}</Text>
                      {count > 0 && (
                        <Text
                          style={[
                            styles.emojiCountLarge,
                            active && styles.emojiCountActive,
                          ]}
                        >
                          {count}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Answers Section Header ── */}
          <View style={styles.answersSectionHeader}>
            <Text style={styles.answersSectionTitle}>
              Answers ({answersCount})
            </Text>
            {answersCount === 0 && (
              <View style={styles.beFirstPill}>
                <Text style={styles.beFirstPillText}>Be first to answer 💬</Text>
              </View>
            )}
          </View>

          {/* ── Answers List ── */}
          {answersCount === 0 ? (
            <View style={styles.emptyAnswersCard}>
              <Text style={styles.emptyAnswersEmoji}>✍️</Text>
              <Text style={styles.emptyAnswersTitle}>No answers yet</Text>
              <Text style={styles.emptyAnswersSubtitle}>
                Know the answer or have advice? Use the quick composer below!
              </Text>
            </View>
          ) : (
            post.answers.map(ans => renderAnswer(ans))
          )}
        </ScrollView>

        {/* ── Sticky Inline Quick Reply Composer ── */}
        <View
          style={[
            styles.composerWrapper,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {/* Replying Banner */}
          {replyingTo && (
            <View style={styles.replyingToBanner}>
              <Text style={styles.replyingToText}>
                Replying to <Text style={{ fontWeight: '800' }}>{replyingTo.authorName}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                style={styles.cancelReplyBtn}
              >
                <X size={14} color='#6B7280' />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.composerInputRow}>
            <TextInput
              ref={replyInputRef}
              style={styles.composerInput}
              placeholder={
                replyingTo
                  ? `Write a response to ${replyingTo.authorName}…`
                  : 'Add your take or answer…'
              }
              placeholderTextColor='#9CA3AF'
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || submitting) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!inputText.trim() || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size='small' color='#000' />
              ) : (
                <Send size={16} color='#000' strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#EBEFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, fontWeight: '700', color: '#6B21A8' },
  errorText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  retryBtn: {
    backgroundColor: '#C4FF0E',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  retryBtnText: { fontSize: 13, fontWeight: '900', color: '#000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
  },
  deleteTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },

  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },

  // Question Card
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#000',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  authorDetails: { flex: 1, gap: 2 },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  authorName: { fontSize: 14, fontWeight: '800', color: '#0D0D0D' },
  peerBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  peerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B21A8',
  },
  courseTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#C4FF0E',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#000',
  },
  courseTagBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0D0D0D',
  },
  postMetaText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },

  questionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0D0D0D',
    lineHeight: 25,
  },
  questionBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
    fontWeight: '500',
  },

  // Reaction Bar
  questionReactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reactionPrompt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  emojiReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  emojiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emojiPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  emojiPillActive: {
    backgroundColor: '#FDF2F8',
    borderColor: '#DB2777',
  },
  emojiIcon: { fontSize: 13 },
  emojiIconLarge: { fontSize: 15 },
  emojiCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  emojiCountLarge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  emojiCountActive: {
    color: '#DB2777',
  },

  // Answers Header
  answersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  answersSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0D0D0D',
  },
  beFirstPill: {
    backgroundColor: '#C4FF0E',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  beFirstPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },

  // Empty Answers
  emptyAnswersCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyAnswersEmoji: { fontSize: 32 },
  emptyAnswersTitle: { fontSize: 16, fontWeight: '800', color: '#0D0D0D' },
  emptyAnswersSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Answer Card
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  answerAuthorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerBody: {
    fontSize: 13.5,
    color: '#1F2937',
    lineHeight: 20,
    fontWeight: '500',
  },
  answerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  answerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  replyCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  quickReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  quickReplyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7B2FBE',
  },

  // Replies Section
  repliesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  repliesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  repliesLoadingText: { fontSize: 12, color: '#6B7280' },
  repliesErrorRow: { paddingVertical: 6 },
  repliesErrorText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  emptyRepliesText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 4,
  },

  // Comment Node
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentItemNested: {
    marginLeft: 14,
    backgroundColor: '#F3F4F6',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  commentAuthorMeta: { flex: 1 },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  peerBadgeSmall: {
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  peerBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B21A8',
  },
  commentDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  commentBody: {
    fontSize: 12.5,
    color: '#374151',
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineReplyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B2FBE',
  },
  nestedContainer: {
    marginTop: 6,
    gap: 6,
  },
  expandDeepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  expandDeepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B2FBE',
  },
  collapseDeepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  collapseDeepText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Bottom Composer
  composerWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  replyingToBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  replyingToText: {
    fontSize: 11.5,
    color: '#6B21A8',
  },
  cancelReplyBtn: {
    padding: 2,
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C4FF0E',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
    backgroundColor: '#E5E7EB',
  },
});
