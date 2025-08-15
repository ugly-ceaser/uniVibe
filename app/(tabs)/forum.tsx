import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  User,
  Clock,
  Plus,
  ChevronRight,
  Heart,
} from 'lucide-react-native';
import { forumApi } from '@/utils/api';

const categoryColors = {
  Academic: '#667eea',
  Social: '#f093fb',
  General: '#4facfe',
  Technical: '#43e97b',
};

export default function ForumScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    string | 'All'
  >('All');

  const categories = [
    'All',
    'Academic',
    'Social',
    'General',
    'Technical',
  ];

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await forumApi.getQuestions();
        setQuestions(response.data || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);
  const filteredQuestions =
    selectedCategory === 'All'
      ? questions
      : questions.filter(question => question.category === selectedCategory);

  const handleQuestionPress = (question: any) => {
    router.push({
      pathname: '/post-detail',
      params: { postId: question.id },
    });
  };

  const handleNewPost = () => {
    // For now, just show an alert - in a real app this would open a new post form
    alert('New post feature coming soon!');
  };

  const handleLikeQuestion = async (questionId: string) => {
    try {
      // Update local state optimistically
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { ...q, likes: (q.likes || 0) + 1 }
            : q
        )
      );
      
      // In real implementation, make API call here
      // await forumApi.likeQuestion(questionId);
    } catch (error) {
      console.error('Error liking question:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <Text style={styles.headerTitle}>Student Forum</Text>
          <Text style={styles.headerSubtitle}>
            Ask questions and share knowledge
          </Text>
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
        <Text style={styles.headerTitle}>Student Forum</Text>
        <Text style={styles.headerSubtitle}>
          Ask questions and share knowledge
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map(category => (
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
          {filteredQuestions.map(question => (
            <TouchableOpacity
              key={question.id}
              style={styles.postCard}
              onPress={() => handleQuestionPress(question)}
              activeOpacity={0.7}
            >
              <View style={styles.postHeader}>
                <View style={styles.authorInfo}>
                  <View style={styles.avatarContainer}>
                    <User size={16} color='#667eea' strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={styles.authorName}>{question.author}</Text>
                    <View style={styles.postMeta}>
                      <Clock size={12} color='#9ca3af' strokeWidth={2} />
                      <Text style={styles.postTime}>{question.createdAt}</Text>
                    </View>
                  </View>
                </View>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: categoryColors[question.category] + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      { color: categoryColors[question.category] },
                    ]}
                  >
                    {question.category}
                  </Text>
                </View>
              </View>

              <Text style={styles.postTitle}>{question.title}</Text>
              <Text style={styles.postDescription} numberOfLines={2}>
                {question.body}
              </Text>

              <View style={styles.postFooter}>
                <View style={styles.commentsInfo}>
                  <MessageSquare size={16} color='#9ca3af' strokeWidth={2} />
                  <Text style={styles.commentsCount}>
                    {question.answers?.length || 0}{' '}
                    {(question.answers?.length || 0) === 1 ? 'answer' : 'answers'}
                  </Text>
                </View>
                <View style={styles.likesInfo}>
                  <TouchableOpacity
                    onPress={() => handleLikeQuestion(question.id)}
                    style={styles.likeButton}
                  >
                    <Heart size={16} color='#ef4444' strokeWidth={2} />
                    <Text style={styles.likesCount}>{question.likes || 0}</Text>
                  </TouchableOpacity>
                </View>
                <ChevronRight size={16} color='#9ca3af' strokeWidth={2} />
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
          <Plus size={24} color='#ffffff' strokeWidth={2} />
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
  likesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  likesCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginLeft: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },
});
