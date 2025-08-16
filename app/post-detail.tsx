import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  User,
  Clock,
  MessageSquare,
  Send,
  Heart,
} from 'lucide-react-native';
import { useApi } from '@/utils/api';

const categoryColors = {
  Academic: '#667eea',
  Social: '#f093fb',
  General: '#4facfe',
  Technical: '#43e97b',
};

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { authGet, authPost } = useApi();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  React.useEffect(() => {
    const fetchPostDetails = async () => {
      try {
        setLoading(true);
        const response = await authGet(`/forum/questions/${postId}`);
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching post details:', error);
        Alert.alert('Error', 'Failed to load post details');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPostDetails();
    }
  }, [postId, authGet]);

  const handleLikePost = async () => {
    try {
      setPost((prev: any) => ({ ...prev, likes: (prev.likes || 0) + 1 }));
      await authPost(`/forum/questions/${postId}/like`);
    } catch (error) {
      console.error('Error liking post:', error);
      setPost((prev: any) => ({ ...prev, likes: Math.max((prev.likes || 1) - 1, 0) }));
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      setPost((prev: any) => ({
        ...prev,
        comments: prev.comments.map((comment: any) =>
          comment.id === commentId
            ? { ...comment, likes: (comment.likes || 0) + 1 }
            : comment
        ),
      }));
      await authPost(`/forum/comments/${commentId}/like`);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      const response = await authPost(`/forum/questions/${postId}/answers`, {
        body: newComment.trim(),
      });
      
      setPost((prev: any) => ({
        ...prev,
        comments: [...(prev.comments || []), response.data],
      }));
      
      setNewComment('');
      Alert.alert('Success', 'Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleReplyToComment = async (commentId: string) => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    try {
      const response = await authPost('/forum/comments', {
        answerId: commentId,
        text: replyText.trim(),
      });

      setPost((prev: any) => ({
        ...prev,
        comments: prev.comments.map((comment: any) =>
          comment.id === commentId
            ? {
                ...comment,
                replies: [...(comment.replies || []), response.data],
              }
            : comment
        ),
      }));

      setReplyText('');
      setReplyingTo(null);
      Alert.alert('Success', 'Reply added successfully!');
    } catch (error) {
      console.error('Error adding reply:', error);
      Alert.alert('Error', 'Failed to add reply');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color='#ffffff' strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum Post</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Post not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color='#ffffff' strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Forum Post</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <View style={styles.authorInfo}>
              <View style={styles.avatarContainer}>
                <User size={20} color='#667eea' strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.authorName}>{post.author?.name || post.author}</Text>
                <View style={styles.postMeta}>
                  <Clock size={12} color='#9ca3af' strokeWidth={2} />
                  <Text style={styles.postTime}>{post.createdAt}</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryColors[post.category] + '20' },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: categoryColors[post.category] },
                ]}
              >
                {post.category}
              </Text>
            </View>
          </View>

          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.body || post.content}</Text>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLikePost}
            >
              <Heart size={16} color='#ef4444' strokeWidth={2} />
              <Text style={styles.likesText}>{post.likes || 0} likes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <MessageSquare size={20} color='#667eea' strokeWidth={2} />
            <Text style={styles.commentsTitle}>
              {post.answers?.length || post.comments?.length || 0}{' '}
              {(post.answers?.length || post.comments?.length || 0) === 1 ? 'Answer' : 'Answers'}
            </Text>
          </View>

          {(post.answers || post.comments || []).map((comment: any) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAuthorInfo}>
                  <View style={styles.commentAvatarContainer}>
                    <User size={16} color='#667eea' strokeWidth={2} />
                  </View>
                  <Text style={styles.commentAuthorName}>
                    {comment.author?.name || comment.author}
                  </Text>
                </View>
                <Text style={styles.commentTime}>{comment.createdAt}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.body || comment.content}</Text>
              
              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.commentLikeButton}
                  onPress={() => handleLikeComment(comment.id)}
                >
                  <Heart size={14} color='#ef4444' strokeWidth={2} />
                  <Text style={styles.commentLikesText}>{comment.likes || 0}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => setReplyingTo(comment.id)}
                >
                  <Text style={styles.replyButtonText}>Reply</Text>
                </TouchableOpacity>
              </View>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <View style={styles.replyInputContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder='Write a reply...'
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    maxLength={500}
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity
                      style={styles.cancelReplyButton}
                      onPress={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                    >
                      <Text style={styles.cancelReplyText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sendReplyButton,
                        !replyText.trim() && styles.sendReplyButtonDisabled,
                      ]}
                      onPress={() => handleReplyToComment(comment.id)}
                      disabled={!replyText.trim()}
                    >
                      <Text style={styles.sendReplyText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                  {comment.replies.map((reply: any) => (
                    <View key={reply.id} style={styles.replyCard}>
                      <View style={styles.replyHeader}>
                        <View style={styles.replyAuthorInfo}>
                          <View style={styles.replyAvatarContainer}>
                            <User size={14} color='#667eea' strokeWidth={2} />
                          </View>
                          <Text style={styles.replyAuthorName}>
                            {reply.author?.name || reply.author}
                          </Text>
                        </View>
                        <Text style={styles.replyTime}>{reply.createdAt}</Text>
                      </View>
                      <Text style={styles.replyContent}>{reply.text || reply.content}</Text>
                      
                      <TouchableOpacity
                        style={styles.replyLikeButton}
                        onPress={() => handleLikeComment(reply.id)}
                      >
                        <Heart size={12} color='#ef4444' strokeWidth={2} />
                        <Text style={styles.replyLikesText}>{reply.likes || 0}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Add Comment Section */}
        <View style={styles.addCommentSection}>
          <Text style={styles.addCommentTitle}>Add an Answer</Text>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder='Share your knowledge or ask a follow-up question...'
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.commentSendButton,
                !newComment.trim() && styles.commentSendButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Send size={20} color='#ffffff' strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorName: {
    fontSize: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
  },
  postTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
  },
  likesText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ef4444',
    marginLeft: 6,
  },
  commentsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginLeft: 8,
  },
  commentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAuthorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
  },
  commentContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  commentLikesText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginLeft: 4,
  },
  replyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
  },
  replyButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
  },
  replyInputContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    maxHeight: 80,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  cancelReplyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  sendReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#667eea',
    borderRadius: 6,
  },
  sendReplyButtonDisabled: {
    opacity: 0.5,
  },
  sendReplyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
  },
  replyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  replyAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyAvatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  replyAuthorName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
  },
  replyTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
  },
  replyContent: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 18,
    marginBottom: 6,
  },
  replyLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  replyLikesText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginLeft: 2,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 50,
  },
  addCommentSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addCommentTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
  },
  commentSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendButtonDisabled: {
    opacity: 0.5,
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