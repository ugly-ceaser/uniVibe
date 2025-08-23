import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  HelpCircle,
  Lightbulb
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi, forumApi } from '../../utils/api';
import { ForumPost, Forum } from '../../utils/types';

const { width } = Dimensions.get('window');

// Forum categories with icons (similar to guide categories)
const forumCategories = [
  { id: 'all', name: 'All Posts', icon: Users, color: '#667eea' },
  { id: 'academic', name: 'Academic Help', icon: BookOpen, color: '#10b981' },
  { id: 'technology', name: 'Tech Support', icon: Code, color: '#3b82f6' },
  { id: 'career', name: 'Career & Jobs', icon: Briefcase, color: '#f59e0b' },
  { id: 'general', name: 'General Chat', icon: MessageCircle, color: '#8b5cf6' },
  { id: 'resources', name: 'Resources', icon: Lightbulb, color: '#06b6d4' },
];

export default function ForumScreen() {
  const router = useRouter();
  const api = useApi();
  const forumClient = forumApi(api);
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);

  const PAGE_SIZE = 20;
  const MIN_FETCH_INTERVAL = 5000;

  const fetchPosts = useCallback(async (
    pageNum: number = 1, 
    isRefresh: boolean = false,
    isLoadMore: boolean = false,
    categoryFilter?: string
  ) => {
    const now = Date.now();
    
    if (!isRefresh && !isLoadMore && (now - lastFetch < MIN_FETCH_INTERVAL)) {
      console.log('⏭️ Skipping fetch - too soon since last request');
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      console.log(`📋 Fetching posts - Page: ${pageNum}, Category: ${categoryFilter || 'all'}`);
      
      const response = await forumClient.getQuestions({
        page: pageNum,
        pageSize: PAGE_SIZE,
        refresh: isRefresh
      });
      
      if (response?.data?.questions) {
        const newPosts = response.data.questions;
        
        if (isRefresh || pageNum === 1) {
          setPosts(newPosts);
          setPage(2);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
          setPage(pageNum + 1);
        }
        
        setHasMore(pageNum < (response.data.totalPages || 1));
        setLastFetch(now);
      } else {
        if (pageNum === 1) {
          setPosts([]);
        }
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('💥 Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
      if (pageNum === 1) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [forumClient, lastFetch]);

  const fetchForums = useCallback(async () => {
    try {
      const response = await forumClient.getForums();
      if (response?.data) {
        setForums(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch forums:', err);
    }
  }, [forumClient]);

  useEffect(() => {
    fetchPosts(1);
    fetchForums();
  }, []);

  // Refresh when screen comes into focus (but not too frequently)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetch > MIN_FETCH_INTERVAL * 2) { // 10 seconds for focus refresh
        console.log('🔄 Screen focused - refreshing posts');
        fetchPosts(1, false, false);
      }
    }, [fetchPosts, lastFetch])
  );

  const onRefresh = useCallback(() => {
    console.log('🔃 Manual refresh triggered');
    fetchPosts(1, true, false, selectedCategory);
  }, [fetchPosts, selectedCategory]);

  const onLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && posts.length > 0) {
      console.log('⬇️ Loading more posts');
      fetchPosts(page, false, true, selectedCategory);
    }
  }, [fetchPosts, page, loadingMore, loading, hasMore, posts.length, selectedCategory]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    if (categoryId !== selectedCategory) {
      setSelectedCategory(categoryId);
      setPage(1);
      fetchPosts(1, true, false, categoryId);
    }
  }, [selectedCategory, fetchPosts]);

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

  const renderCategoryItem = ({ item }: { item: typeof forumCategories[0] }) => {
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
          <Icon 
            size={24} 
            color={isSelected ? '#ffffff' : item.color} 
          />
          <Text style={[
            styles.categoryText,
            isSelected && styles.selectedCategoryText
          ]}>
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

      {/* Categories Section - Similar to Guide Categories */}
      <View style={styles.categoriesSection}>
        <FlatList
          data={forumCategories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      {/* Posts List */}
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

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/create-post')}
      >
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.fabGradient}>
          <Plus size={24} color="#ffffff" />
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
  },
  categoriesContainer: {
    paddingHorizontal: 16,
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
