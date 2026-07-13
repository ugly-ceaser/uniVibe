import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ThumbsUp,
  Bookmark,
  Share2,
  Plus,
  ChevronDown,
  MoreVertical,
  Check,
  MessageCircle,
  ArrowRight,
  ChevronUp,
} from 'lucide-react-native';
import { useApi } from '@/utils/api';
import { showMessage } from 'react-native-flash-message';

// Helper to determine initials and a color for avatar
const getAvatarConfig = (name: string) => {
  const cleanName = name || 'Anonymous';
  const initial = cleanName.charAt(0).toUpperCase();
  const colors = [
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#10B981',
    '#3B82F6',
    '#F59E0B',
  ];
  const charCodeSum = cleanName
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const color = colors[charCodeSum % colors.length];
  return { initial, color };
};

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { authGet, authPost } = useApi();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(0);

  // Sorting state: 'top' | 'new'
  const [sortBy, setSortBy] = useState<'top' | 'new'>('top');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Fetch post details
  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      const response = await authGet<any>(`/forum/questions/${postId}`);
      if (response && response.data) {
        setPost(response.data);
        setHelpfulCount(response.data.likes || 0);
      }
    } catch (error) {
      console.error('Error fetching post details:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to load post details',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
  }, [postId]);

  // Handle post helpful (like) toggle
  const handleHelpfulToggle = async () => {
    try {
      const originalHelpful = helpful;
      const originalCount = helpfulCount;

      setHelpful(!originalHelpful);
      setHelpfulCount(originalHelpful ? originalCount - 1 : originalCount + 1);

      await authPost<any>(`/forum/questions/${postId}/like`);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert if API fails
      setHelpful(helpful);
      setHelpfulCount(helpfulCount);
    }
  };

  // Handle share action
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this discussion on UniVibe: "${post?.title}"\n\n${
          post?.body || post?.content || ''
        }`,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Handle answer submission
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      const response = await authPost<any>(
        `/forum/questions/${postId}/answers`,
        {
          body: newComment.trim(),
        }
      );

      if (response && response.data) {
        setPost((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), response.data],
          answers: [...(prev.answers || []), response.data],
        }));
        setNewComment('');
        showMessage({
          message: 'Success',
          description: 'Answer added successfully!',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to add answer',
        type: 'danger',
      });
    }
  };

  // Like/upvote a comment (increases count)
  const handleVoteComment = async (commentId: string, type: 'up' | 'down') => {
    try {
      setPost((prev: any) => {
        const commentsKey = prev.comments ? 'comments' : 'answers';
        const updatedList = (prev[commentsKey] || []).map((comment: any) => {
          if (comment.id === commentId) {
            const currentLikes = comment.likes || 0;
            return {
              ...comment,
              likes:
                type === 'up'
                  ? currentLikes + 1
                  : Math.max(currentLikes - 1, 0),
            };
          }
          return comment;
        });
        return { ...prev, [commentsKey]: updatedList };
      });

      // Call backend like
      await authPost<any>(`/forum/comments/${commentId}/like`);
    } catch (error) {
      console.error('Error voting comment:', error);
    }
  };

  // Format date nicely
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#7B2FBE' />
        <Text style={styles.loadingText}>Loading discussion...</Text>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const authorConfig = getAvatarConfig(post.author?.name || post.author || '');
  const answersList = post.answers || post.comments || [];

  // Sort answers
  const sortedAnswers = [...answersList].sort((a: any, b: any) => {
    if (sortBy === 'top') {
      return (b.likes || 0) - (a.likes || 0);
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={['#3B0F6F', '#7B2FBE', '#C026D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color='#fff' strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerLabel}>STUDENT FORUM</Text>
              <Text style={styles.headerTitle}>Discussion</Text>
            </View>

            <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.8}>
              <MoreVertical size={20} color='#fff' strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Question Card ── */}
          <View style={styles.questionCard}>
            {/* Category Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <View style={styles.categoryDot} />
                <Text style={styles.categoryText}>
                  {(post.category || 'General').toUpperCase().replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.questionTitle}>{post.title}</Text>

            {/* Meta (Author, Date) */}
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: authorConfig.color },
                ]}
              >
                <Text style={styles.miniAvatarText}>
                  {authorConfig.initial}
                </Text>
              </View>
              <Text style={styles.authorName}>
                {post.author?.name || post.author || 'Anonymous'}
              </Text>

              <View style={styles.dateBadge}>
                <Calendar
                  size={12}
                  color='#6B7280'
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.dateText}>
                  {formatDate(post.createdAt)}
                </Text>
              </View>
            </View>

            {/* Body */}
            <Text style={styles.questionBody}>{post.body || post.content}</Text>

            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  helpful && styles.actionButtonActive,
                ]}
                onPress={handleHelpfulToggle}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>👍</Text>
                <Text style={styles.actionButtonText}>
                  {helpfulCount > 0 ? `Helpful (${helpfulCount})` : 'Helpful'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  saved && styles.actionButtonActive,
                ]}
                onPress={() => setSaved(!saved)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>🔖</Text>
                <Text style={styles.actionButtonText}>
                  {saved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>🔗</Text>
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Answers Header ── */}
          <View style={styles.answersHeaderRow}>
            <Text style={styles.answersCountText}>
              Answers ({answersList.length})
            </Text>

            <View style={styles.answersHeaderRight}>
              {answersList.length > 0 && (
                <View style={{ position: 'relative', zIndex: 10 }}>
                  <TouchableOpacity
                    style={styles.sortDropdown}
                    onPress={() => setShowSortMenu(!showSortMenu)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sortDropdownText}>
                      {sortBy === 'top' ? 'Top' : 'Newest'}
                    </Text>
                    <ChevronDown size={14} color='#7B2FBE' strokeWidth={2.5} />
                  </TouchableOpacity>

                  {showSortMenu && (
                    <View style={styles.sortMenu}>
                      <TouchableOpacity
                        style={styles.sortMenuItem}
                        onPress={() => {
                          setSortBy('top');
                          setShowSortMenu(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.sortMenuItemText,
                            sortBy === 'top' && styles.sortMenuItemTextActive,
                          ]}
                        >
                          Top
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sortMenuItem}
                        onPress={() => {
                          setSortBy('new');
                          setShowSortMenu(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.sortMenuItemText,
                            sortBy === 'new' && styles.sortMenuItemTextActive,
                          ]}
                        >
                          Newest
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.inlineAddAnswerBtn}
                onPress={() =>
                  showMessage({
                    message: 'Scroll to the bottom to write an answer!',
                    type: 'info',
                  })
                }
                activeOpacity={0.8}
              >
                <Plus
                  size={14}
                  color='#fff'
                  strokeWidth={2.5}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.inlineAddAnswerText}>Add answer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Empty State / Answers List ── */}
          {answersList.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Text style={{ fontSize: 32 }}>🌱</Text>
              </View>
              <Text style={styles.emptyTitle}>No answers yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to help{' '}
                {post.author?.name || post.author || 'martins'} out — your
                answer could save someone else the same headache.
              </Text>
            </View>
          ) : (
            <View style={styles.answersList}>
              {sortedAnswers.map((answer: any, index: number) => {
                const answerAuthor = getAvatarConfig(
                  answer.author?.name || answer.author || 'Student'
                );
                const isBestAnswer =
                  sortBy === 'top' && index === 0 && (answer.likes || 0) > 0;

                return (
                  <View key={answer.id || index} style={styles.answerCard}>
                    {isBestAnswer && (
                      <View style={styles.bestAnswerBadge}>
                        <Check
                          size={12}
                          color='#1a1a2e'
                          strokeWidth={3}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.bestAnswerText}>Best answer</Text>
                      </View>
                    )}

                    <View style={styles.answerHeader}>
                      <View
                        style={[
                          styles.miniAvatar,
                          {
                            backgroundColor: answerAuthor.color,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                          },
                        ]}
                      >
                        <Text style={[styles.miniAvatarText, { fontSize: 12 }]}>
                          {answerAuthor.initial}
                        </Text>
                      </View>
                      <View style={styles.answerHeaderMeta}>
                        <Text style={styles.answerAuthorName}>
                          {answer.author?.name || answer.author || 'Student'}
                        </Text>
                        <Text style={styles.answerTime}>
                          Answered {formatDate(answer.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.answerContent}>
                      {answer.body || answer.content}
                    </Text>

                    <View style={styles.answerActions}>
                      {/* Up/Down Vote Control */}
                      <View style={styles.voteControl}>
                        <TouchableOpacity
                          style={styles.voteBtn}
                          onPress={() => handleVoteComment(answer.id, 'up')}
                          activeOpacity={0.7}
                        >
                          <ChevronUp
                            size={16}
                            color='#1a1a2e'
                            strokeWidth={2.5}
                          />
                        </TouchableOpacity>
                        <Text style={styles.voteCount}>
                          {answer.likes || 0}
                        </Text>
                        <TouchableOpacity
                          style={styles.voteBtn}
                          onPress={() => handleVoteComment(answer.id, 'down')}
                          activeOpacity={0.7}
                        >
                          <ChevronDown
                            size={16}
                            color='#1a1a2e'
                            strokeWidth={2.5}
                          />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.replyActionBtn}
                        onPress={() =>
                          showMessage({
                            message: 'Replies coming soon!',
                            type: 'info',
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <MessageCircle
                          size={14}
                          color='#6B7280'
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.replyActionText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Sticky Bottom Input Bar ── */}
        <View style={styles.bottomInputBar}>
          <View
            style={[
              styles.miniAvatar,
              {
                backgroundColor: '#F43F5E',
                width: 36,
                height: 36,
                borderRadius: 18,
              },
            ]}
          >
            <Text style={[styles.miniAvatarText, { fontSize: 14 }]}>M</Text>
          </View>

          <TextInput
            style={styles.bottomTextInput}
            placeholder='Write an answer...'
            placeholderTextColor='#9CA3AF'
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !newComment.trim() && styles.sendBtnDisabled,
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F43F5E', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendGradient}
            >
              <ArrowRight size={18} color='#fff' strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EDE9F8' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE9F8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#7B2FBE',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE9F8',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#7B2FBE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },

  // ── Header ──
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 14,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C8F135',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  headerMenuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Scroll Content ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Question Card ──
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1a1a2e',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8F135',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a2e',
    marginRight: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    lineHeight: 26,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    marginRight: 10,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  questionBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderRadius: 1,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    borderRadius: 20,
    paddingVertical: 8,
  },
  actionButtonActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7B2FBE',
  },
  actionIcon: {
    marginRight: 4,
    fontSize: 14,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  // ── Answers Header ──
  answersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  answersCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  answersHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  sortDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  sortMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    borderRadius: 10,
    padding: 4,
    width: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sortMenuItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  sortMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  sortMenuItemTextActive: {
    color: '#7B2FBE',
    fontWeight: '800',
  },
  inlineAddAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B2FBE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },
  inlineAddAnswerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Empty State ──
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1a1a2e',
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Answers List & Cards ──
  answersList: {
    gap: 12,
  },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1a1a2e',
    padding: 16,
    position: 'relative',
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  bestAnswerBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8F135',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestAnswerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerHeaderMeta: {
    marginLeft: 8,
  },
  answerAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  answerTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  answerContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 14,
  },
  answerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9F8',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 6,
  },
  voteBtn: {
    padding: 2,
  },
  voteCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  replyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  // ── Bottom Input Bar ──
  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  bottomTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1a1a2e',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
