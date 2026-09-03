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
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi, forumApi, ForumPost } from '@/utils/api';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { TabTransitionWrapper } from '@/components/TabTransitionWrapper';
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

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ForumScreen() {
  const router = useRouter();
  const api = useApi();
  const { user } = useAuth();
  const forumClient = useMemo(() => forumApi(api), [api]);
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
  const lastFetchRef = useRef(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  );
  const searchGenerationRef = useRef(0);
  const categoriesFetched = useRef(false);
  const MIN_FETCH_INTERVAL = 10000;
  const PAGE_SIZE = 20;

  const scheduleRetry = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      retryTimeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    retryTimeoutsRef.current.add(timeout);
  }, []);

  // ─── Collapsible header animation ───────────────────────────────────────────
  const headerAnim = useRef(new Animated.Value(1)).current;
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const onListScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      if (delta > 8 && headerVisible) {
        // scrolling DOWN — collapse header
        setHeaderVisible(false);
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: false,
        }).start();
      } else if ((delta < -8 || y <= 10) && !headerVisible) {
        // scrolling UP / back to top — expand header
        setHeaderVisible(true);
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    },
    [headerAnim, headerVisible]
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
      )
        return;

      try {
        if (isRefresh) setRefreshing(true);
        else if (isLoadMore) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const tryProcess = (data: any) => {
          if (data?.questions) {
            const batch: ForumPost[] = data.questions;
            const fetchedCursor: string | null = data.nextCursor || null;

            if (isRefresh || !cursorStr) {
              setAllPosts(batch);
              setPosts(batch);
              setNextCursor(fetchedCursor);
            } else {
              setAllPosts(prev => {
                const combined = [...prev, ...batch];
                // Deduplicate by ID
                // Note: The appended diversity post from page 1 may naturally reappear in page 2
                // due to its organic score. Client-side ID deduplication prevents this duplicate
                // from rendering in the list without corrupting the pagination cursor.
                const unique = combined.filter(
                  (post, index, self) =>
                    self.findIndex(p => p.id === post.id) === index
                );
                setPosts(unique);
                return unique;
              });
              setNextCursor(fetchedCursor);
            }
            setHasMore(!!fetchedCursor);
            lastFetchRef.current = now;
            return true;
          }
          return false;
        };

        const response: any = await forumClient.getQuestions({
          page: 1, // dummy fallback
          pageSize: PAGE_SIZE,
          refresh: isRefresh,
          category: categoryEnum,
          cursor: cursorStr || undefined,
        } as any);

        let ok = tryProcess(response?.data);
        if (!ok) {
          const fresh: any = await forumClient.getQuestions({
            page: 1,
            pageSize: PAGE_SIZE,
            refresh: true,
            category: categoryEnum,
            cursor: cursorStr || undefined,
          } as any);
          tryProcess(fresh?.data);
        }
      } catch (err: any) {
        if (err.status === 429 && retryCount < 3) {
          scheduleRetry(
            () =>
              fetchPosts(
                cursorStr,
                isRefresh,
                isLoadMore,
                categoryEnum,
                retryCount + 1
              ),
            Math.pow(2, retryCount) * 1000
          );
          return;
        }
        setError(
          err.status === 429
            ? 'Too many requests. Please wait a moment.'
            : err instanceof Error
            ? err.message
            : 'Failed to load posts.'
        );
      } finally {
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
    fetchPosts(null, true, false, getSelectedEnum());
    fetchCategories();
  }, [getSelectedEnum, fetchPosts, fetchCategories]);

  const onLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && posts.length > 0) {
      fetchPosts(nextCursor, false, true, getSelectedEnum());
    }
  }, [
    nextCursor,
    loadingMore,
    loading,
    hasMore,
    posts.length,
    getSelectedEnum,
    fetchPosts,
  ]);

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

  const displayedPosts = useMemo(
    () => (showSearch && searchQuery ? searchResults : posts),
    [showSearch, searchQuery, searchResults, posts]
  );

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
      const authorName = post.author?.fullname || 'Unknown';
      const bgColor = avatarColor(authorName);
      const abbr = initials(authorName);
      const answerCount = post._count?.answers ?? 0;
      const canManage = canManageForumContent(user, post.authorId);

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
              style={{ gap: 10 }}
            >
              {/* Author row */}
              <View style={styles.authorRow}>
                <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                  <Text style={styles.avatarText}>{abbr}</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>{authorName}</Text>
                  <Text style={styles.postDate}>
                    {formatDate(post.createdAt)}
                  </Text>
                </View>
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

            {/* Actions */}
            <View style={[styles.postActions, { marginTop: 10 }]}>
              {/* Answers chip – left */}
              <View style={styles.actionChip}>
                <MessageCircle size={13} color='#555' />
                <Text style={styles.actionChipText}>
                  {answerCount} answer{answerCount !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Ownership-aware moderation action */}
              <View style={styles.actionRight}>
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
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to start a discussion!
          </Text>
        </View>
      ),
    [loading]
  );

  // ─── Full loading state ───────────────────────────────────────────────────────
  if (loading && !refreshing && posts.length === 0) {
    return (
      <TabTransitionWrapper>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.heroBannerWrapper}>
            <LinearGradient
              colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.decorCircle} />
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeText}>PEER TO PEER</Text>
              </View>
              <Text style={styles.heroHeading}>
                Spill the tea,{'\n'}ask away 💬
              </Text>
              <Text style={styles.heroSubtitle}>
                Real answers from real students who've been there.
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.loadingBox}>
            <ActivityIndicator size='large' color='#7B2FBE' />
            <Text style={styles.loadingText}>Loading posts…</Text>
          </View>
        </SafeAreaView>
      </TabTransitionWrapper>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <TabTransitionWrapper>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ─── Collapsible header: Hero + Search + Categories ─── */}
        <Animated.View
          style={[
            styles.collapsibleHeader,
            {
              opacity: headerAnim,
              maxHeight: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 400],
              }),
              overflow: 'hidden',
            },
          ]}
        >
          {/* Hero Banner */}
          <View
            style={[
              styles.heroBannerWrapper,
              { marginHorizontal: lightTheme.spacing.md, marginTop: 12 },
            ]}
          >
            <LinearGradient
              colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.decorCircle} />
              <View style={styles.heroBannerTop}>
                <View style={styles.seasonBadge}>
                  <Text style={styles.seasonBadgeText}>PEER TO PEER</Text>
                </View>
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
              </View>
              <Text style={styles.heroHeading}>
                Spill the tea,{'\n'}ask away 💬
              </Text>
              <Text style={styles.heroSubtitle}>
                Real answers from real students who've been there.
              </Text>
            </LinearGradient>
          </View>

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

          {/* Category Pills */}
          <FlatList
            horizontal
            data={categories}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            style={styles.filterRow}
            nestedScrollEnabled
            renderItem={({ item }) => {
              const isActive = item.id === selectedCategory;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive,
                  ]}
                  onPress={() => setSelectedCategory(item.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>

        {/* ─── Error ─── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchPosts(null, true, false, getSelectedEnum())}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Posts List ─── */}
        <FlatList
          data={displayedPosts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor='#7B2FBE'
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: clearance },
          ]}
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
      </SafeAreaView>
    </TabTransitionWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },

  // ─── Hero Banner ───
  heroBannerWrapper: {
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    marginBottom: lightTheme.spacing.md,
    overflow: 'hidden',
  },
  heroBanner: {
    borderRadius: 22,
    padding: 20,
    paddingBottom: lightTheme.spacing.lg,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -30,
    right: -30,
  },
  heroBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seasonBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
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
  heroHeading: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    fontWeight: '500',
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
    marginHorizontal: lightTheme.spacing.md,
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
  filterRow: { marginBottom: 12, height: 56, flexShrink: 0 },
  filterList: {
    paddingHorizontal: lightTheme.spacing.md,
    gap: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  filterPill: {
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  filterPillActive: { backgroundColor: '#0D0D0D' },
  filterPillText: { fontSize: 13, fontWeight: '700', color: '#0D0D0D' },
  filterPillTextActive: { color: '#C4FF0E' },

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
    marginHorizontal: lightTheme.spacing.md,
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

  // ─── List ───
  listContent: { paddingHorizontal: lightTheme.spacing.md },

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
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  authorName: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },
  postDate: { fontSize: 12, color: '#888', fontWeight: '500' },
  postTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D0D',
    lineHeight: 22,
  },
  postBody: { fontSize: 13, color: '#555', lineHeight: 19 },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#F5F5F5',
  },
  actionChipText: { fontSize: 12, fontWeight: '600', color: '#444' },
  actionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#DB2777',
    backgroundColor: '#FFF0F6',
  },
  loveBtnActive: { backgroundColor: '#DB2777', borderColor: '#DB2777' },
  loveBtnText: { fontSize: 12, fontWeight: '700', color: '#DB2777' },
  loveBtnTextActive: { color: '#fff' },
  reportBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
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
    marginBottom: 20,
  },

  // ─── Collapsible header ───
  collapsibleHeader: {},

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
