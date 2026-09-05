import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Plus,
  Search,
  MessageCircle,
  BookOpen,
  Code,
  Briefcase,
  Users,
  Flag,
  Trash2,
  X,
  HelpCircle,
  Heart,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi, forumApi, likesApi, ForumPost } from '@/utils/api';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { TabTransitionWrapper } from '@/components/TabTransitionWrapper';
import { HeroBanner } from '@/components/HeroBanner';
import { FilterPill } from '@/components/FilterPill';
import { ScrollableScreen } from '@/components/ScrollableScreen';
import { useAuth } from '@/contexts/AuthContext';
import { canManageForumContent } from '@/utils/forum';
import { lightTheme } from '@/constants/theme';

// ─── Category config ──────────────────────────────────────────────────────────
type CategoryChipItem = { id: string; name: string; icon: any; color: string };

const CATEGORY_DEFS: CategoryChipItem[] = [
  { id: 'all', name: 'All posts', icon: Users, color: '#7B2FBE' },
  {
    id: 'general-discussion',
    name: 'General',
    icon: MessageCircle,
    color: '#8b5cf6',
  },
  {
    id: 'academic-help',
    name: 'Academic help',
    icon: BookOpen,
    color: '#10b981',
  },
  { id: 'student-life', name: 'Student life', icon: Users, color: '#06b6d4' },
  {
    id: 'career-internships',
    name: 'Career',
    icon: Briefcase,
    color: '#f59e0b',
  },
  { id: 'tech-programming', name: 'Tech', icon: Code, color: '#3b82f6' },
  { id: 'campus-services', name: 'Campus', icon: Flag, color: '#ef4444' },
];

const CATEGORY_TO_ENUM: Record<string, string> = {
  'general-discussion': 'GENERAL_DISCUSSION',
  'academic-help': 'ACADEMIC_HELP',
  'student-life': 'STUDENT_LIFE',
  'career-internships': 'CAREER_AND_INTERNSHIPS',
  'tech-programming': 'TECH_AND_PROGRAMMING',
  'campus-services': 'CAMPUS_SERVICES',
};

// Avatar background colours
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

function formatRelativeTime(dateString: string) {
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
    return '';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ForumScreen() {
  const router = useRouter();
  const { authorId, myPosts } = useLocalSearchParams<{
    authorId?: string;
    myPosts?: string;
  }>();
  const api = useApi();
  const { user } = useAuth();

  const targetAuthorId = useMemo(() => {
    if (myPosts === 'true' && user?.id) return user.id;
    return authorId || null;
  }, [authorId, myPosts, user?.id]);
  const forumClient = useMemo(() => forumApi(api), [api]);
  const likesClient = useMemo(() => likesApi(api), [api]);
  const clearance = useTabBarClearance(64); // Clearance for floating FAB
  const fabBottom = useTabBarClearance(16); // 16px above the tab bar

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [allPosts, setAllPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<ForumPost[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] =
    useState<CategoryChipItem[]>(CATEGORY_DEFS);
  const [postReactions, setPostReactions] = useState<
    Record<string, { counts: Record<string, number>; userReacted?: string }>
  >({});
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [selectedCourseCode, setSelectedCourseCode] = useState('all');

  const handleToggleLike = useCallback(
    async (postId: string, emoji: string = '❤️') => {
      const isCurrentlyLiked = likedPostIds.has(postId);
      const nextLiked = !isCurrentlyLiked;

      // Optimistic reaction update
      setLikedPostIds(prev => {
        const next = new Set(prev);
        if (nextLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });

      setPostReactions(prev => {
        const current = prev[postId] || { counts: {} };
        const curCount = current.counts[emoji] || 0;
        return {
          ...prev,
          [postId]: {
            counts: {
              ...current.counts,
              [emoji]: nextLiked ? curCount + 1 : Math.max(0, curCount - 1),
            },
            userReacted: nextLiked ? emoji : undefined,
          },
        };
      });

      const updateList = (list: ForumPost[]) =>
        list.map(p => {
          if (p.id !== postId) return p;
          const currentCount = p.reactionCount ?? p.likes ?? 0;
          const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));
          return {
            ...p,
            isLiked: nextLiked,
            reactionCount: nextCount,
            likes: nextCount,
          };
        });

      setPosts(updateList);
      setAllPosts(updateList);
      setSearchResults(updateList);

      try {
        if (nextLiked) {
          await likesClient.like('Question', postId);
        } else {
          await likesClient.unlike('Question', postId);
        }
      } catch {
        // Rollback on failure
        setLikedPostIds(prev => {
          const next = new Set(prev);
          if (isCurrentlyLiked) next.add(postId);
          else next.delete(postId);
          return next;
        });
        setPostReactions(prev => {
          const current = prev[postId] || { counts: {} };
          const curCount = current.counts[emoji] || 0;
          return {
            ...prev,
            [postId]: {
              counts: {
                ...current.counts,
                [emoji]: isCurrentlyLiked ? curCount + 1 : Math.max(0, curCount - 1),
              },
              userReacted: isCurrentlyLiked ? emoji : undefined,
            },
          };
        });
        const rollbackList = (list: ForumPost[]) =>
          list.map(p => {
            if (p.id !== postId) return p;
            const currentCount = p.reactionCount ?? p.likes ?? 0;
            const originalCount = Math.max(0, currentCount + (isCurrentlyLiked ? 1 : -1));
            return {
              ...p,
              isLiked: isCurrentlyLiked,
              reactionCount: originalCount,
              likes: originalCount,
            };
          });
        setPosts(rollbackList);
        setAllPosts(rollbackList);
        setSearchResults(rollbackList);
      }
    },
    [likedPostIds, likesClient]
  );

  const lastFetchRef = useRef(0);
  const isFetchingRef = useRef(false);
  const isFetchingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const nextCursorRef = useRef<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  );
  const searchGenerationRef = useRef(0);
  const categoriesFetched = useRef(false);
  const MIN_FETCH_INTERVAL = 3000;
  const PAGE_SIZE = 20;

  const scheduleRetry = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      retryTimeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    retryTimeoutsRef.current.add(timeout);
  }, []);

  // ─── FAB collapse on scroll ──────────────────────────────────────────────────
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const onListScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      if (delta > 8 && headerVisible) {
        setHeaderVisible(false);
      } else if ((delta < -8 || y <= 10) && !headerVisible) {
        setHeaderVisible(true);
      }
    },
    [headerVisible]
  );

  const getSelectedEnum = useCallback(
    () =>
      selectedCategory === 'all'
        ? undefined
        : CATEGORY_TO_ENUM[selectedCategory],
    [selectedCategory]
  );

  // ─── Fetch posts ────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(
    async (
      cursorStr?: string | null,
      isRefresh = false,
      isLoadMore = false,
      categoryEnum?: string,
      retryCount = 0
    ) => {
      const now = Date.now();
      if (
        !isRefresh &&
        !isLoadMore &&
        now - lastFetchRef.current < MIN_FETCH_INTERVAL
      ) {
        return;
      }

      if (isRefresh) {
        isFetchingRef.current = true;
        setRefreshing(true);
        hasMoreRef.current = true;
        setHasMore(true);
      } else if (isLoadMore) {
        isFetchingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        isFetchingRef.current = true;
        setLoading(true);
      }
      setError(null);

      try {
        const response: any = await forumClient.getQuestions({
          page: 1,
          pageSize: PAGE_SIZE,
          refresh: isRefresh,
          category: categoryEnum,
          cursor: cursorStr || undefined,
        } as any);

        const data = response?.data;
        if (data?.questions) {
          const batch: ForumPost[] = data.questions;
          const fetchedCursor: string | null = data.nextCursor || null;
          const moreAvailable = Boolean(
            fetchedCursor && batch.length >= PAGE_SIZE
          );

          hasMoreRef.current = moreAvailable;
          setHasMore(moreAvailable);
          nextCursorRef.current = fetchedCursor;
          setNextCursor(fetchedCursor);

          if (isRefresh || !cursorStr) {
            setAllPosts(batch);
            setPosts(batch);
          } else {
            setAllPosts(prev => {
              const combined = [...prev, ...batch];
              // Deduplicate by ID
              const unique = combined.filter(
                (post, index, self) =>
                  self.findIndex(p => p.id === post.id) === index
              );
              setPosts(unique);
              return unique;
            });
          }
          lastFetchRef.current = now;
        } else {
          if (isRefresh || !cursorStr) {
            setAllPosts([]);
            setPosts([]);
          }
          hasMoreRef.current = false;
          setHasMore(false);
          nextCursorRef.current = null;
          setNextCursor(null);
        }
      } catch (err: any) {
        if (err.status === 429) {
          if (!isLoadMore && retryCount < 2) {
            scheduleRetry(
              () =>
                fetchPosts(
                  cursorStr,
                  isRefresh,
                  isLoadMore,
                  categoryEnum,
                  retryCount + 1
                ),
              Math.pow(2, retryCount) * 2000
            );
            return;
          }
          setError('Too many requests. Please wait a moment.');
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to load posts.'
          );
        }
      } finally {
        isFetchingRef.current = false;
        isFetchingMoreRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [forumClient, scheduleRetry]
  );

  // ─── Fetch categories ───────────────────────────────────────────────────────
  const fetchCategories = useCallback(
    async (retryCount = 0) => {
      try {
        const response = await forumClient.listCategories();
        const fetched = response?.data || [];
        if (fetched.length > 0) {
          const getIcon = (name: string) => {
            const n = name.toLowerCase();
            if (n.includes('academic') || n.includes('help')) return BookOpen;
            if (n.includes('career') || n.includes('intern')) return Briefcase;
            if (n.includes('tech') || n.includes('program')) return Code;
            if (n.includes('student') || n.includes('life')) return Users;
            if (n.includes('campus') || n.includes('service'))
              return HelpCircle;
            return MessageCircle;
          };
          const getColor = (name: string) => {
            const n = name.toLowerCase();
            if (n.includes('academic')) return '#10b981';
            if (n.includes('career')) return '#f59e0b';
            if (n.includes('tech')) return '#3b82f6';
            if (n.includes('student')) return '#06b6d4';
            if (n.includes('campus')) return '#ef4444';
            return '#8b5cf6';
          };
          setCategories([
            { id: 'all', name: 'All posts', icon: Users, color: '#7B2FBE' },
            ...fetched.map((cat: any) => ({
              id: cat.slug || cat.id,
              name: cat.name,
              icon: getIcon(cat.name),
              color: getColor(cat.name),
            })),
          ]);
        }
      } catch (error: any) {
        if (error.status === 429 && retryCount < 2) {
          scheduleRetry(
            () => fetchCategories(retryCount + 1),
            Math.pow(2, retryCount) * 3000
          );
        }
      }
    },
    [forumClient, scheduleRetry]
  );

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setPosts(allPosts);
  }, [allPosts]);

  useEffect(() => {
    hasMoreRef.current = true;
    nextCursorRef.current = null;
    setAllPosts([]);
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts(null, true, false, getSelectedEnum());
  }, [fetchPosts, getSelectedEnum, selectedCategory]);

  useEffect(() => {
    if (!categoriesFetched.current) {
      categoriesFetched.current = true;
      fetchCategories();
    }
  }, [fetchCategories]);

  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      retryTimeoutsRef.current.forEach(clearTimeout);
      retryTimeoutsRef.current.clear();
      searchGenerationRef.current += 1;
    },
    []
  );

  const onRefresh = useCallback(() => {
    hasMoreRef.current = true;
    nextCursorRef.current = null;
    fetchPosts(null, true, false, getSelectedEnum());
    fetchCategories();
  }, [getSelectedEnum, fetchPosts, fetchCategories]);

  const onLoadMore = useCallback(() => {
    if (
      isFetchingMoreRef.current ||
      isFetchingRef.current ||
      !hasMoreRef.current ||
      !nextCursorRef.current ||
      posts.length === 0
    ) {
      return;
    }
    isFetchingMoreRef.current = true;
    fetchPosts(nextCursorRef.current, false, true, getSelectedEnum());
  }, [getSelectedEnum, fetchPosts, posts.length]);

  const handleSearch = useCallback(
    async (
      query: string,
      retryCount = 0,
      generation = searchGenerationRef.current
    ) => {
      if (!query.trim()) {
        if (generation === searchGenerationRef.current) {
          setSearchResults([]);
          setIsSearching(false);
        }
        return;
      }
      try {
        if (generation !== searchGenerationRef.current) return;
        setIsSearching(true);
        const response = await forumClient.searchQuestions({
          query: query.trim(),
          page: 1,
          pageSize: 20,
        });
        if (generation === searchGenerationRef.current) {
          setSearchResults(response?.data || []);
        }
      } catch (error: any) {
        if (error.status === 429 && retryCount < 2) {
          scheduleRetry(
            () => handleSearch(query, retryCount + 1, generation),
            Math.pow(2, retryCount) * 1500
          );
          return;
        }
        if (generation === searchGenerationRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (generation === searchGenerationRef.current) {
          setIsSearching(false);
        }
      }
    },
    [forumClient, scheduleRetry]
  );

  const availableCourseCodes = useMemo(() => {
    const codes = new Set<string>();
    allPosts.forEach(p => {
      if (p.courseCode && p.courseCode.trim()) {
        codes.add(p.courseCode.trim().toUpperCase());
      }
    });
    return Array.from(codes).sort();
  }, [allPosts]);

  const displayedPosts = useMemo(() => {
    let source = showSearch && searchQuery ? searchResults : posts;
    if (targetAuthorId) {
      source = source.filter(
        p => p.authorId === targetAuthorId || p.author?.id === targetAuthorId
      );
    }
    if (selectedCourseCode !== 'all') {
      source = source.filter(
        p =>
          p.courseCode?.trim().toUpperCase() ===
          selectedCourseCode.toUpperCase()
      );
    }
    return source;
  }, [
    showSearch,
    searchQuery,
    searchResults,
    posts,
    selectedCourseCode,
    targetAuthorId,
  ]);

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (postId: string) => {
      try {
        await forumClient.deleteQuestion(postId);
        Alert.alert('Success', 'Question deleted successfully');

        // Remove from local state immediately
        setAllPosts(prev => prev.filter(p => p.id !== postId));
        setPosts(prev => prev.filter(p => p.id !== postId));
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete question');
      }
    },
    [forumClient]
  );

  const handleReport = useCallback(
    async (postId: string, reason: string) => {
      try {
        const response = await forumClient.reportQuestion(postId, reason);
        if (response?.data?.statusUpdated) {
          // Filter it out locally if hidden
          setAllPosts(prev => prev.filter(p => p.id !== postId));
          setPosts(prev => prev.filter(p => p.id !== postId));
          Alert.alert(
            'Report Received',
            'This post has been hidden for review due to multiple reports.'
          );
        } else {
          Alert.alert('Report Received', 'Thank you for reporting this post.');
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to report question');
      }
    },
    [forumClient]
  );

  const renderPost = useCallback(
    ({ item: post }: { item: ForumPost }) => {
      if (!post?.id) return null;
      const authorName = post.author?.fullname || 'Anonymous';
      const bgColor = avatarColor(authorName);
      const abbr = initials(authorName);
      const answerCount = post._count?.answers ?? post.answerCount ?? 0;
      const canManage = canManageForumContent(user, post.authorId);

      // Lifecycle badge logic
      const postAgeHours =
        (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      const isHot =
        (post.score && post.score > 2.5) ||
        answerCount >= 3 ||
        (post.reactionCount || 0) >= 4;
      const isNew = !isHot && postAgeHours < 8;

      // Peer identity signal
      const dept = post.author?.department || post.department;
      const level = post.author?.level;
      const peerTag = dept ? `${dept}${level ? ` • ${level}L` : ''}` : null;

      // Views count with fallback proof-of-life
      const views =
        post.viewCount ||
        post.views ||
        Math.max(1, Math.floor(((post.score || 1) * 9) % 45) + 3);

      return (
        <View style={styles.cardWrapper}>
          <View style={styles.postCard}>
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/post/${post.id}?title=${encodeURIComponent(
                    post.title || ''
                  )}`
                )
              }
              activeOpacity={0.85}
              style={{ gap: 8 }}
            >
              {/* Author & Header Row */}
              <View style={styles.authorHeaderRow}>
                <View style={styles.authorInfoLeft}>
                  <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                    <Text style={styles.avatarText}>{abbr}</Text>
                  </View>
                  <View style={styles.authorDetails}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{authorName}</Text>
                      {peerTag ? (
                        <View style={styles.peerBadge}>
                          <Text style={styles.peerBadgeText} numberOfLines={1}>
                            {peerTag}
                          </Text>
                        </View>
                      ) : null}
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

                {/* Lifecycle Badge */}
                {isHot ? (
                  <View style={styles.hotBadge}>
                    <Text style={styles.hotBadgeText}>🔥 HOT</Text>
                  </View>
                ) : isNew ? (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>✨ NEW</Text>
                  </View>
                ) : answerCount > 0 ? (
                  <View style={styles.answeredBadge}>
                    <Text style={styles.answeredBadgeText}>ANSWERED</Text>
                  </View>
                ) : null}
              </View>

              {/* Title */}
              <Text style={styles.postTitle} numberOfLines={2}>
                {post.title}
              </Text>

              {/* Body preview */}
              <Text style={styles.postBody} numberOfLines={2}>
                {post.body}
              </Text>
            </TouchableOpacity>

            {/* Actions & Engagement Bar */}
            <View style={styles.postActions}>
              {/* Answer Social Proof CTA / Count */}
              {answerCount === 0 ? (
                <TouchableOpacity
                  style={styles.firstAnswerCta}
                  onPress={() =>
                    router.push(
                      `/post/${post.id}?title=${encodeURIComponent(
                        post.title || ''
                      )}`
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.firstAnswerCtaText}>
                    Be first to answer 💬
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.answeredChip}
                  onPress={() =>
                    router.push(
                      `/post/${post.id}?title=${encodeURIComponent(
                        post.title || ''
                      )}`
                    )
                  }
                  activeOpacity={0.8}
                >
                  <MessageCircle size={13} color='#7B2FBE' strokeWidth={2.2} />
                  <Text style={styles.answeredChipText}>
                    {answerCount} answer{answerCount !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Right Side: Quick Reactions & Manage Button */}
              <View style={styles.actionRight}>
                {/* Quick Emoji Reactions */}
                <View style={styles.emojiReactionRow}>
                  {['🔥', '💡', '❤️'].map(emoji => {
                    const active =
                      postReactions[post.id]?.userReacted === emoji ||
                      (emoji === '❤️' && likedPostIds.has(post.id));
                    const baseReactionCount = post.reactionCount ?? post.likes ?? 0;
                    const count =
                      postReactions[post.id]?.counts?.[emoji] ??
                      (emoji === '❤️' ? baseReactionCount : 0);
                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.emojiPill,
                          active && styles.emojiPillActive,
                        ]}
                        onPress={() => handleToggleLike(post.id, emoji)}
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

                {/* Trash/Report button */}
                {canManage ? (
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => {
                      Alert.alert(
                        'Delete Post',
                        'Are you sure you want to delete this question? This action cannot be undone.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => handleDelete(post.id),
                          },
                        ]
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Trash2 size={14} color='#ef4444' strokeWidth={2} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => {
                      Alert.alert(
                        'Report Post',
                        'Why are you reporting this post?',
                        [
                          {
                            text: 'Spam',
                            onPress: () => handleReport(post.id, 'Spam'),
                          },
                          {
                            text: 'Abuse / Harassment',
                            onPress: () => handleReport(post.id, 'Abuse'),
                          },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Flag size={14} color='#9ca3af' strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    },
    [
      router,
      user,
      handleDelete,
      handleReport,
      postReactions,
      likedPostIds,
      handleToggleLike,
    ]
  );

  const renderFooter = useCallback(
    () =>
      loadingMore ? (
        <View style={styles.loadingMore}>
          <ActivityIndicator size='small' color='#7B2FBE' />
        </View>
      ) : null,
    [loadingMore]
  );

  const renderEmpty = useCallback(
    () =>
      loading ? null : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>
            {targetAuthorId
              ? myPosts === 'true'
                ? "You haven't posted any questions yet"
                : 'No posts found for this user'
              : selectedCourseCode !== 'all'
              ? `No posts for ${selectedCourseCode}`
              : 'No posts yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {targetAuthorId
              ? 'Start a discussion or ask a question to your peers!'
              : selectedCourseCode !== 'all'
              ? 'Try clearing the course filter or starting a new post.'
              : 'Be the first to start a discussion!'}
          </Text>
          {targetAuthorId ? (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() =>
                router.setParams({ authorId: undefined, myPosts: undefined })
              }
            >
              <Text style={styles.clearFilterBtnText}>Show all posts</Text>
            </TouchableOpacity>
          ) : selectedCourseCode !== 'all' ? (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => setSelectedCourseCode('all')}
            >
              <Text style={styles.clearFilterBtnText}>Show all courses</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ),
    [loading, selectedCourseCode, targetAuthorId, myPosts, router]
  );

  // ─── Hero & Search ─────────────────────────────────────────────────────────
  const hero = (
    <>
      <HeroBanner
        badgeText="PEER TO PEER"
        title={'Spill the tea,\nask away 💬'}
        subtitle="Real answers from real students who've been there."
        rightAction={
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={() => setShowSearch(v => !v)}
          >
            {showSearch ? (
              <X size={18} color='#000' />
            ) : (
              <Search size={18} color='#000' />
            )}
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Search size={16} color='#666' />
          <TextInput
            style={styles.searchInput}
            placeholder='Search posts…'
            placeholderTextColor='#999'
            value={searchQuery}
            onChangeText={q => {
              setSearchQuery(q);
              searchGenerationRef.current += 1;
              const generation = searchGenerationRef.current;
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              searchTimeoutRef.current = setTimeout(
                () => handleSearch(q, 0, generation),
                400
              );
            }}
            autoFocus
          />
          {isSearching && (
            <ActivityIndicator size='small' color='#7B2FBE' />
          )}
        </View>
      )}
    </>
  );

  // ─── Filter Chips ───────────────────────────────────────────────────────────
  const filterChips = (
    <View style={{ gap: 6 }}>
      {targetAuthorId && (
        <View style={styles.activeAuthorBanner}>
          <Text style={styles.activeAuthorBannerText}>
            👤 {myPosts === 'true' ? 'My Questions & Posts' : 'Filtered by User'}
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.setParams({ authorId: undefined, myPosts: undefined })
            }
            style={styles.clearAuthorBtn}
          >
            <X size={12} color='#7B2FBE' />
            <Text style={styles.clearAuthorBtnText}>Clear filter</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      >
        {categories.map(item => (
          <FilterPill
            key={item.id}
            label={item.name}
            isActive={item.id === selectedCategory}
            onPress={() => setSelectedCategory(item.id)}
          />
        ))}
      </ScrollView>

      {availableCourseCodes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.courseFilterList}
        >
          <TouchableOpacity
            style={[
              styles.courseFilterChip,
              selectedCourseCode === 'all' && styles.courseFilterChipActive,
            ]}
            onPress={() => setSelectedCourseCode('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.courseFilterChipText,
                selectedCourseCode === 'all' && styles.courseFilterChipTextActive,
              ]}
            >
              All courses
            </Text>
          </TouchableOpacity>

          {availableCourseCodes.map(code => {
            const isActive = selectedCourseCode === code;
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.courseFilterChip,
                  isActive && styles.courseFilterChipActive,
                ]}
                onPress={() =>
                  setSelectedCourseCode(isActive ? 'all' : code)
                }
                activeOpacity={0.8}
              >
                <BookOpen size={12} color={isActive ? '#0D0D0D' : '#7B2FBE'} />
                <Text
                  style={[
                    styles.courseFilterChipText,
                    isActive && styles.courseFilterChipTextActive,
                  ]}
                >
                  {code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ─── Empty or Error Component ───────────────────────────────────────────────
  const emptyOrError = error ? (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={() => fetchPosts(null, true, false, getSelectedEnum())}
      >
        <Text style={styles.retryBtnText}>Try again</Text>
      </TouchableOpacity>
    </View>
  ) : (
    renderEmpty()
  );

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <TabTransitionWrapper>
      <View style={styles.container}>
        <ScrollableScreen
          hero={hero}
          filterChips={filterChips}
          data={displayedPosts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={emptyOrError}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.15}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          extraBottomPadding={64}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor='#7B2FBE'
            />
          }
        />

        {/* ─── Floating FAB (bottom-right) ─── */}
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={() => router.push('/create-post')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#9333EA', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={
              headerVisible ? styles.fabGradientFull : styles.fabGradientCompact
            }
          >
            <Plus size={16} color='#fff' strokeWidth={2.5} />
            {headerVisible && (
              <Text style={styles.fabText}>Post a question</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TabTransitionWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },

  searchIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },

  // ─── Search ───
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0D0D0D',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },

  // ─── Filter Pills ───
  filterList: {
    paddingHorizontal: lightTheme.spacing.md,
    gap: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },

  // ─── Loading ───
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#555', fontWeight: '600' },
  loadingMore: { paddingVertical: 20, alignItems: 'center' },

  // ─── Error ───
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: lightTheme.spacing.md,
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },

  // ─── Post Card ───
  cardWrapper: {
    marginBottom: lightTheme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    padding: lightTheme.spacing.md,
    gap: 10,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#000',
  },
  courseTagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
  postMetaText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ─── Lifecycle Badges ───
  hotBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hotBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  newBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  answeredBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  answeredBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },

  postTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D0D',
    lineHeight: 22,
  },
  postBody: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  firstAnswerCta: {
    backgroundColor: '#C4FF0E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  firstAnswerCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  answeredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  answeredChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B2FBE',
  },

  actionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emojiReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emojiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emojiPillActive: {
    backgroundColor: '#FDF2F8',
    borderColor: '#DB2777',
  },
  emojiIcon: {
    fontSize: 13,
  },
  emojiCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  emojiCountActive: {
    color: '#DB2777',
  },
  reportBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  // ─── Empty ───
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D0D0D',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  clearFilterBtn: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginTop: 8,
  },
  clearFilterBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D0D0D',
  },

  // ─── Active Author Banner ───
  activeAuthorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDE9FE',
    marginHorizontal: lightTheme.spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7B2FBE',
    marginBottom: 4,
  },
  activeAuthorBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7B2FBE',
  },
  clearAuthorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7B2FBE',
  },
  clearAuthorBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#7B2FBE',
  },

  // ─── Course Filter Chips ───
  courseFilterList: {
    paddingHorizontal: lightTheme.spacing.md,
    gap: 8,
    alignItems: 'center',
    paddingBottom: 4,
  },
  courseFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  courseFilterChipActive: {
    backgroundColor: '#C4FF0E',
    borderColor: '#000000',
  },
  courseFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  courseFilterChipTextActive: {
    fontWeight: '900',
    color: '#0D0D0D',
  },

  // ─── FAB ───
  fab: {
    position: 'absolute',
    bottom: lightTheme.spacing.sm,
    right: lightTheme.spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    backgroundColor: '#fff',
  },
  fabGradientFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  fabGradientCompact: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  fabText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
