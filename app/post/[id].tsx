import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  MessageCircle, 
  Heart, 
  Share, 
  Calendar, 
  User, 
  Tag,
  Send,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Bookmark,
  Eye
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi, forumApi } from '../../utils/api';
import { QuestionDetail, Answer } from '../../utils/types';

const { width } = Dimensions.get('window');

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const api = useApi();
  const forumClient = forumApi(api);
  
  const [post, setPost] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

  const fetchPostDetails = useCallback(async () => {
    if (!id || hasAttempted || typeof id !== 'string') {
      console.log('⏭️ Skipping post detail fetch - invalid conditions');
      setLoading(false);
      return;
    }

    try {
      console.log('📄 Fetching post details for:', id);
      setLoading(true);
      setError(null);
      
      const response = await forumClient.getQuestion(id);
      
      if (response?.data) {
        setPost(response.data);
        console.log('✅ Post details loaded successfully');
      }
    } catch (err: any) {
      console.error('💥 Error fetching post details:', err);
      if (err.status === 404) {
        setError('Post not found');
      } else if (err.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to load post details. Please try again.');
      }
    } finally {
      setLoading(false);
      setHasAttempted(true);
    }
  }, [id, forumClient, hasAttempted]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffMinutes = Math.ceil(diffTime / (1000 * 60));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Cleared':
        return { 
          color: '#10b981', 
          bgColor: '#dcfce7', 
          icon: CheckCircle,
          text: 'Resolved'
        };
      case 'Open':
        return { 
          color: '#3b82f6', 
          bgColor: '#dbeafe', 
          icon: Clock,
          text: 'Open'
        };
      case 'Closed':
        return { 
          color: '#ef4444', 
          bgColor: '#fee2e2', 
          icon: XCircle,
          text: 'Closed'
        };
      default:
        return { 
          color: '#6b7280', 
          bgColor: '#f3f4f6', 
          icon: Clock,
          text: status
        };
    }
  };

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    // TODO: Implement like API call
  }, [isLiked]);

  const handleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark API call
  }, [isBookmarked]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    Alert.alert('Share', 'Share functionality coming soon!');
  }, []);

  const handleAnswerSubmit = useCallback(async () => {
    if (!answerText.trim() || !post?.id) return;

    try {
      setSubmittingAnswer(true);
      await forumClient.addAnswer(post.id, { body: answerText.trim() });
      
      setAnswerText('');
      setShowAnswerForm(false);
      
      // Refresh post details
      setHasAttempted(false);
      fetchPostDetails();
      
      Alert.alert('Success', 'Your answer has been posted!');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      Alert.alert('Error', 'Failed to post your answer. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  }, [answerText, post?.id, forumClient, fetchPostDetails]);

  const toggleAnswerExpanded = useCallback((answerId: string) => {
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(answerId)) {
        newSet.delete(answerId);
      } else {
        newSet.add(answerId);
      }
      return newSet;
    });
  }, []);

  const renderAnswer = useCallback((answer: Answer) => {
    const isExpanded = expandedAnswers.has(answer.id);
    const shouldTruncate = answer.body.length > 200;

    return (
      <View key={answer.id} style={styles.answerCard}>
        <View style={styles.answerHeader}>
          <View style={styles.answerAuthorInfo}>
            <View style={styles.answerAvatar}>
              <User size={16} color="#6b7280" />
            </View>
            <View>
              <Text style={styles.answerAuthorName}>
                {answer.author.fullname}
              </Text>
              <Text style={styles.answerDate}>
                {formatDate(answer.createdAt)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.answerMenuButton}>
            <MoreVertical size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Text style={styles.answerBody} numberOfLines={isExpanded ? undefined : 4}>
          {answer.body}
        </Text>

        {shouldTruncate && (
          <TouchableOpacity 
            onPress={() => toggleAnswerExpanded(answer.id)}
            style={styles.readMoreButton}
          >
            <Text style={styles.readMoreText}>
              {isExpanded ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.answerActions}>
          <TouchableOpacity style={styles.answerActionButton}>
            <Heart size={16} color="#9ca3af" />
            <Text style={styles.answerActionText}>Like</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.answerActionButton}>
            <MessageCircle size={16} color="#9ca3af" />
            <Text style={styles.answerActionText}>
              Reply ({answer._count.comments})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [expandedAnswers, toggleAnswerExpanded]);

  const handleRetry = () => {
    setHasAttempted(false);
    fetchPostDetails();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading post details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Error</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Post not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(post.status);
  const StatusIcon = statusConfig.icon;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Discussion
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question Card */}
          <View style={styles.questionCard}>
            {/* Status and Forum Badge */}
            <View style={styles.questionHeader}>
              <View style={styles.badgesContainer}>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={12} color={statusConfig.color} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </View>
                <View style={styles.forumBadge}>
                  <Tag size={12} color="#6b7280" />
                  <Text style={styles.forumText}>{post.forum.name}</Text>
                </View>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Eye size={14} color="#9ca3af" />
                  <Text style={styles.statText}>245</Text>
                </View>
                <View style={styles.statItem}>
                  <MessageCircle size={14} color="#9ca3af" />
                  <Text style={styles.statText}>{post._count.answers}</Text>
                </View>
              </View>
            </View>

            {/* Question Title */}
            <Text style={styles.questionTitle}>{post.title}</Text>

            {/* Question Body */}
            <Text style={styles.questionBody}>{post.body}</Text>

            {/* Author Info */}
            <View style={styles.authorSection}>
              <View style={styles.authorInfo}>
                <View style={styles.authorAvatar}>
                  <User size={20} color="#6b7280" />
                </View>
                <View>
                  <Text style={styles.authorName}>{post.author.fullname}</Text>
                  <View style={styles.authorMeta}>
                    <Calendar size={12} color="#9ca3af" />
                    <Text style={styles.authorDate}>
                      Asked {formatDate(post.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, isLiked && styles.actionButtonActive]}
                onPress={handleLike}
              >
                <Heart 
                  size={18} 
                  color={isLiked ? "#ffffff" : "#667eea"} 
                  fill={isLiked ? "#ffffff" : "none"}
                />
                <Text style={[styles.actionButtonText, isLiked && styles.actionButtonTextActive]}>
                  Like
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, isBookmarked && styles.actionButtonActive]}
                onPress={handleBookmark}
              >
                <Bookmark 
                  size={18} 
                  color={isBookmarked ? "#ffffff" : "#667eea"} 
                  fill={isBookmarked ? "#ffffff" : "none"}
                />
                <Text style={[styles.actionButtonText, isBookmarked && styles.actionButtonTextActive]}>
                  Save
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleShare}
              >
                <Share size={18} color="#667eea" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowAnswerForm(true)}
              >
                <MessageCircle size={18} color="#667eea" />
                <Text style={styles.actionButtonText}>Answer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Answers Section */}
          <View style={styles.answersSection}>
            <View style={styles.answersSectionHeader}>
              <Text style={styles.answersTitle}>
                Answers ({post._count.answers})
              </Text>
              {post._count.answers > 0 && (
                <TouchableOpacity style={styles.sortButton}>
                  <Text style={styles.sortButtonText}>Most Helpful</Text>
                </TouchableOpacity>
              )}
            </View>

            {post.answers.length > 0 ? (
              post.answers.map(renderAnswer)
            ) : (
              <View style={styles.noAnswersContainer}>
                <MessageCircle size={48} color="#d5d5db" />
                <Text style={styles.noAnswersText}>No answers yet</Text>
                <Text style={styles.noAnswersSubtext}>
                  Be the first to help answer this question!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Answer Form */}
        {showAnswerForm && (
          <View style={styles.answerForm}>
            <View style={styles.answerFormHeader}>
              <Text style={styles.answerFormTitle}>Write an answer</Text>
              <TouchableOpacity 
                onPress={() => setShowAnswerForm(false)}
                style={styles.answerFormClose}
              >
                <Text style={styles.answerFormCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.answerInput}
              placeholder="Share your knowledge and help others..."
              placeholderTextColor="#9ca3af"
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              textAlignVertical="top"
            />
            
            <TouchableOpacity 
              style={[
                styles.submitAnswerButton,
                !answerText.trim() && styles.submitAnswerButtonDisabled
              ]}
              onPress={handleAnswerSubmit}
              disabled={!answerText.trim() || submittingAnswer}
            >
              {submittingAnswer ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={16} color="#ffffff" />
                  <Text style={styles.submitAnswerButtonText}>Post Answer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Answer Button */}
        {!showAnswerForm && (
          <TouchableOpacity 
            style={styles.quickAnswerButton}
            onPress={() => setShowAnswerForm(true)}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.quickAnswerGradient}
            >
              <MessageCircle size={20} color="#ffffff" />
              <Text style={styles.quickAnswerText}>Add Answer</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
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
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  
  // Loading & Error States
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Question Card
  questionCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  forumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  forumText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    lineHeight: 30,
    marginBottom: 16,
  },
  questionBody: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  authorSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 20,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  actionButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea',
  },
  actionButtonTextActive: {
    color: '#ffffff',
  },

  // Answers Section
  answersSection: {
    margin: 16,
    marginTop: 0,
  },
  answersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  answersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  answerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  answerAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  answerDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  answerMenuButton: {
    padding: 4,
  },
  answerBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  readMoreText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  answerActions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  answerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  answerActionText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  noAnswersContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  noAnswersText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 12,
  },
  noAnswersSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },

  // Answer Form
  answerForm: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  answerFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  answerFormClose: {
    padding: 4,
  },
  answerFormCloseText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#374151',
    minHeight: 100,
    marginBottom: 12,
  },
  submitAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitAnswerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitAnswerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Quick Answer Button
  quickAnswerButton: {
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
  quickAnswerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
  },
  quickAnswerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});