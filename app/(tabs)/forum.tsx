import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  Plus, 
  Search, 
  Heart, 
  MessageCircle, 
  Calendar, 
  User, 
  BookOpen,
  Code,
  Briefcase,
  Users,
  HelpCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi, forumApi } from '../../utils/api';
import { ForumPost } from '../../utils/types';

const { width } = Dimensions.get('window');

// Small type for chips
type CategoryChipItem = { id: string; name: string; icon: any; color: string };

// Fixed categories you requested
const CATEGORY_DEFS: CategoryChipItem[] = [
  { id: 'all',                 name: 'All Posts',            icon: Users,         color: '#667eea' },
  { id: 'general-discussion',  name: 'General Discussion',   icon: MessageCircle, color: '#8b5cf6' },
  { id: 'academic-help',       name: 'Academic Help',        icon: BookOpen,      color: '#10b981' },
  { id: 'student-life',        name: 'Student Life',         icon: Users,         color: '#06b6d4' },
  { id: 'career-internships',  name: 'Career & Internships', icon: Briefcase,     color: '#f59e0b' },
  { id: 'tech-programming',    name: 'Tech & Programming',   icon: Code,          color: '#3b82f6' },
  { id: 'campus-services',     name: 'Campus Services',      icon: HelpCircle,    color: '#ef4444' },
];

// Map chip id -> API enum
const CATEGORY_TO_ENUM: Record<string, string> = {
  'general-discussion':  'GENERAL_DISCUSSION',
  'academic-help':       'ACADEMIC_HELP',
  'student-life':        'STUDENT_LIFE',
  'career-internships':  'CAREER_AND_INTERNSHIPS',
  'tech-programming':    'TECH_AND_PROGRAMMING',
  'campus-services':     'CAMPUS_SERVICES'
};

export default function ForumScreen() {
  const router = useRouter();
  const api = useApi();
  const forumClient = forumApi(api);
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [allPosts, setAllPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);
  const lastFetchRef = useRef(0);

  const PAGE_SIZE = 20;
  const MIN_FETCH_INTERVAL = 5000;

  // Show a spinner on the categories row while fetching page 1 or refreshing
  const isCategoryLoading = refreshing || (loading && page === 1);

  // Page-level loading banner (not shown during load-more)
  const isPageLoadingBanner = (loading || refreshing) && !loadingMore;

  // Helper to get enum for current selection
  const getSelectedEnum = useCallback(() => {
    return selectedCategory === 'all' ? undefined : CATEGORY_TO_ENUM[selectedCategory];
  }, [selectedCategory]);

  // Stabilize fetchPosts by removing lastFetch from deps and passing category explicitly
  const fetchPosts = useCallback(async (
    pageNum: number = 1,
    isRefresh: boolean = false,
    isLoadMore: boolean = false,
    categoryEnum?: string
  ) => {
    const now = Date.now();
    if (!isRefresh && !isLoadMore && (now - lastFetchRef.current < MIN_FETCH_INTERVAL)) {
      console.log('⏭️ Skipping fetch - too soon since last request');
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      console.log(`📋 Fetching posts - Page: ${pageNum}, CategoryEnum: ${categoryEnum ?? 'ALL'}`);

      const tryProcess = (data: any) => {
        if (data?.questions) {
          const newBatch: ForumPost[] = data.questions;
          console.log('🧮 Questions received:', newBatch.length);

          if (isRefresh || pageNum === 1) {
            setAllPosts(newBatch);
            setPosts(newBatch);
            setPage(2);
          } else {
            setAllPosts((prev) => {
              const combined = [...prev, ...newBatch];
              setPosts(combined);
              return combined;
            });
            setPage(pageNum + 1);
          }

          setHasMore(pageNum < (data.totalPages || 1));
          lastFetchRef.current = now;
          setLastFetch(now);
          return true;
        }
        return false;
      };

      const response = await forumClient.getQuestions({
        page: pageNum,
        pageSize: PAGE_SIZE,
        refresh: isRefresh,
        category: categoryEnum, // pass through to backend
      } as any);
      console.log('🧾 forum.getQuestions response.data:', response?.data);

      let processed = tryProcess(response?.data);

      if (!processed) {
        console.log('♻️ Retrying with refresh to bypass cache...');
        const fresh = await forumClient.getQuestions({
          page: pageNum,
          pageSize: PAGE_SIZE,
          refresh: true,
          category: categoryEnum,
        } as any);
        console.log('🧾 forum.getQuestions fresh.data:', fresh?.data);
        processed = tryProcess(fresh?.data);
      }

      if (!processed) {
        console.warn('⚠️ No data returned even after refresh; preserving current list');
      }
    } catch (err: any) {
      console.error('💥 Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [forumClient]);

  useEffect(() => {
    // initial load
    fetchPosts(1, false, false, getSelectedEnum());
  }, []);
  
  // Replace client-side filter sync with a simple mirror of server results
  useEffect(() => {
    setPosts(allPosts);
  }, [allPosts]);

  // On category change: reset and fetch from server with that category
  useEffect(() => {
    setAllPosts([]);
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true, false, getSelectedEnum());
    // NOTE: do NOT include fetchPosts in deps to avoid infinite loop
  }, [selectedCategory]);

  // Refresh when screen comes into focus (but not too frequently)
  const didFocusOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didFocusOnce.current) {
        didFocusOnce.current = true;
        return;
      }
      const now = Date.now();
      if (now - lastFetchRef.current > MIN_FETCH_INTERVAL * 2) {
        console.log('🔄 Screen focused - refreshing posts');
        fetchPosts(1, true, false, getSelectedEnum());
      }
    }, [getSelectedEnum, fetchPosts])
  );
 
  const onRefresh = useCallback(() => {
    console.log('🔃 Manual refresh triggered');
    fetchPosts(1, true, false, getSelectedEnum());
  }, [getSelectedEnum, fetchPosts]);

  const onLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && posts.length > 0) {
      console.log('⬇️ Loading more posts');
      fetchPosts(page, false, true, getSelectedEnum());
    }
  }, [page, loadingMore, loading, hasMore, posts.length, getSelectedEnum, fetchPosts]);
 
  // When category changes, filter immediately; no network call needed
  const handleCategorySelect = useCallback((categoryId: string) => {
    if (categoryId === selectedCategory) return;
    console.log('[Forum] Category selected:', categoryId);
    setSelectedCategory(categoryId);
  }, [selectedCategory]);
 
  const handleLike = useCallback((postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: !post.isLiked,
            likes: post.isLiked ? (post.likes || 0) - 1 : (post.likes || 0) + 1
          };
        }
        return post;
      })
    );
  }, []);

  const navigateToPost = useCallback((post: ForumPost) => {
    router.push(`/post/${post.id}?title=${encodeURIComponent(post.title || 'Untitled')}`);
  }, [router]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderCategoryItem = ({ item }: { item: CategoryChipItem }) => {
    const Icon = item.icon;
    const isSelected = selectedCategory === item.id;

    return (
      <TouchableOpacity
        style={[styles.categoryCard, isSelected && styles.selectedCategory]}
        onPress={() => handleCategorySelect(item.id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isSelected ? [item.color, item.color + '80'] : ['#ffffff', '#f8fafc']}
          style={styles.categoryGradient}
        >
          <Icon size={24} color={isSelected ? '#ffffff' : item.color} />
          <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]}>
            {item.name}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderPost = useCallback(({ item: post }: { item: ForumPost }) => {
    if (!post?.id) return null;

    return (
      <TouchableOpacity 
        style={styles.postCard}
        onPress={() => navigateToPost(post)}
        activeOpacity={0.7}
      >
        <View style={styles.postContent}>
          <View style={styles.postHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <User size={16} color="#6b7280" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.username}>
                  {post.author?.fullname || 'Unknown User'}
                </Text>
                <View style={styles.postMeta}>
                  <Calendar size={12} color="#9ca3af" />
                  <Text style={styles.postDate}>
                    {formatDate(post.createdAt)}
                  </Text>
                  <View style={[styles.statusBadge, styles[`status${post.status}`]]}>
                    <Text style={styles.statusText}>{post.status}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.postTitle} numberOfLines={2}>
            {post.title}
          </Text>
          
          <Text style={styles.postPreview} numberOfLines={3}>
            {post.body}
          </Text>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleLike(post.id);
              }}
            >
              <Heart 
                size={16} 
                color={post.isLiked ? "#ef4444" : "#9ca3af"} 
                fill={post.isLiked ? "#ef4444" : "none"}
              />
              <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
                {post.likes || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => e.stopPropagation()}
            >
              <MessageCircle size={16} color="#9ca3af" />
              <Text style={styles.actionText}>
                {post._count?.answers || 0} answers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <HelpCircle size={16} color="#9ca3af" />
              <Text style={styles.actionText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleLike, navigateToPost]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#667eea" />
        <Text style={styles.loadingMoreText}>Loading more posts...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <MessageCircle size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No Posts Yet</Text>
        <Text style={styles.emptyDescription}>
          Be the first to start a discussion in this category!
        </Text>
      </View>
    );
  }, [loading]);

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Forum</Text>
            <TouchableOpacity style={styles.searchButton}>
              <Search size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading forum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Forum</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Search size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Categories Section - Dynamic chips (same screen) */}
      <View style={styles.categoriesSection}>
        <FlatList
          data={CATEGORY_DEFS}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          extraData={selectedCategory} // ensure chip highlight re-renders
        />
        {isCategoryLoading && (
          <View style={styles.categoriesSpinner}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.categoriesSpinnerText}>Loading…</Text>
          </View>
        )}
      </View>

      {/* Page-level loading banner */}
      {isPageLoadingBanner && (
        <View style={styles.pageLoadingBanner}>
          <ActivityIndicator size="small" color="#667eea" />
          <Text style={styles.pageLoadingText}>Loading posts…</Text>
        </View>
      )}

      {/* Posts List (uses filtered posts state) */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.postsContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Error Banner */}
      {error && !refreshing && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchPosts(1)} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Post a Question Button (replaces AI chat) */}
      <TouchableOpacity
        style={styles.postBtn}
        onPress={() => router.push('/create-post')}
        accessibilityRole="button"
        accessibilityLabel="Post a question"
      >
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.postBtnGradient}>
          <Plus size={20} color="#ffffff" />
          <Text style={styles.postBtnText}>Post a Question</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  
  // Categories Section (Similar to Guide)
  categoriesSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative', // enable overlay spinner positioning
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoriesSpinner: {
    position: 'absolute',
    right: 16,
    top: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoriesSpinnerText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryCard: {
    marginRight: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategory: {
    transform: [{ scale: 1.05 }],
  },
  categoryGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#ffffff',
  },
  
  // Posts Section
  postsContainer: {
    padding: 16,
    flexGrow: 1,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  postContent: {
    padding: 16,
  },
  postHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusCleared: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusClosed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 8,
  },
  postPreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  likedText: {
    color: '#ef4444',
  },
  
  // Loading & Empty States
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Error & FAB
  errorBanner: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc2626',
    borderRadius: 4,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Replaced FAB styles with a labeled button
  postBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 28,
  },
  postBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
  },
  postBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  pageLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageLoadingText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '600',
  },
});
