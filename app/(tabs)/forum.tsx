import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MessageSquare, User, Clock, Plus, ChevronRight } from 'lucide-react-native';
import { forumPosts, ForumPost } from '@/data/forumPosts';

const categoryColors = {
  'Academic': '#667eea',
  'Social': '#f093fb',
  'General': '#4facfe',
  'Technical': '#43e97b',
};

export default function ForumScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ForumPost['category'] | 'All'>('All');

  const categories: (ForumPost['category'] | 'All')[] = ['All', 'Academic', 'Social', 'General', 'Technical'];

  const filteredPosts = selectedCategory === 'All' 
    ? forumPosts 
    : forumPosts.filter(post => post.category === selectedCategory);

  const handlePostPress = (post: ForumPost) => {
    router.push({
      pathname: '/post-detail',
      params: { postId: post.id }
    });
  };

  const handleNewPost = () => {
    // For now, just show an alert - in a real app this would open a new post form
    alert('New post feature coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Student Forum</Text>
        <Text style={styles.headerSubtitle}>Ask questions and share knowledge</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.activeCategoryButton,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.activeCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts List */}
        <View style={styles.postsContainer}>
          {filteredPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postCard}
              onPress={() => handlePostPress(post)}
              activeOpacity={0.7}
            >
              <View style={styles.postHeader}>
                <View style={styles.authorInfo}>
                  <View style={styles.avatarContainer}>
                    <User size={16} color="#667eea" strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={styles.authorName}>{post.author}</Text>
                    <View style={styles.postMeta}>
                      <Clock size={12} color="#9ca3af" strokeWidth={2} />
                      <Text style={styles.postTime}>{post.createdAt}</Text>
                    </View>
                  </View>
                </View>
                <View 
                  style={[
                    styles.categoryBadge, 
                    { backgroundColor: categoryColors[post.category] + '20' }
                  ]}
                >
                  <Text 
                    style={[
                      styles.categoryBadgeText, 
                      { color: categoryColors[post.category] }
                    ]}
                  >
                    {post.category}
                  </Text>
                </View>
              </View>

              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postDescription} numberOfLines={2}>
                {post.description}
              </Text>

              <View style={styles.postFooter}>
                <View style={styles.commentsInfo}>
                  <MessageSquare size={16} color="#9ca3af" strokeWidth={2} />
                  <Text style={styles.commentsCount}>
                    {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewPost}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fabGradient}
        >
          <Plus size={24} color="#ffffff" strokeWidth={2} />
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  categoryContainer: {
    marginVertical: 20,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeCategoryButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  activeCategoryText: {
    color: '#ffffff',
  },
  postsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    marginLeft: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
  },
  postTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 6,
  },
  postDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
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