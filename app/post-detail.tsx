import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
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
  MessageCircle,
} from 'lucide-react-native';
import { forumPosts, Comment, Reply } from '@/data/forumPosts';

const categoryColors = {
  Academic: '#667eea',
  Social: '#f093fb',
  General: '#4facfe',
  Technical: '#43e97b',
};

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const [newComment, setNewComment] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [newReply, setNewReply] = React.useState('');

  const post = forumPosts.find(p => p.id === postId);

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Post not found</Text>
      </SafeAreaView>
    );
  }

  const handleAddComment = () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    // Mock adding comment - in real app this would be an API call
    Alert.alert('Success', 'Comment added successfully!', [
      { text: 'OK', onPress: () => setNewComment('') },
    ]);
  };

  const handleLikePost = () => {
    Alert.alert('Success', 'Post liked!');
  };

  const handleLikeComment = (commentId: string) => {
    Alert.alert('Success', `Comment ${commentId} liked!`);
  };

  const handleLikeReply = (replyId: string) => {
    Alert.alert('Success', `Reply ${replyId} liked!`);
  };

  const handleReplyToComment = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleAddReply = () => {
    if (!newReply.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    Alert.alert('Success', 'Reply added successfully!', [
      { 
        text: 'OK', 
        onPress: () => {
          setNewReply('');
          setReplyingTo(null);
        }
      },
    ]);
  };

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
                <Text style={styles.authorName}>{post.author}</Text>
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
          <Text style={styles.postContent}>{post.content}</Text>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLikePost}
            >
              <Heart size={20} color='#ef4444' strokeWidth={2} />
              <Text style={styles.likesText}>{post.likes} likes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <MessageSquare size={20} color='#667eea' strokeWidth={2} />
            <Text style={styles.commentsTitle}>
              {post.comments.length}{' '}
              {post.comments.length === 1 ? 'Comment' : 'Comments'}
            </Text>
          </View>

          {post.comments.map(comment => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAuthorInfo}>
                  <View style={styles.commentAvatarContainer}>
                    <User size={16} color='#667eea' strokeWidth={2} />
                  </View>
                  <Text style={styles.commentAuthorName}>{comment.author}</Text>
                </View>
                <Text style={styles.commentTime}>{comment.createdAt}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>

              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.commentLikeButton}
                  onPress={() => handleLikeComment(comment.id)}
                >
                  <Heart size={14} color='#ef4444' strokeWidth={2} />
                  <Text style={styles.commentLikesText}>{comment.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => handleReplyToComment(comment.id)}
                >
                  <MessageCircle size={14} color='#667eea' strokeWidth={2} />
                  <Text style={styles.replyButtonText}>Reply</Text>
                </TouchableOpacity>
              </View>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                  {comment.replies.map(reply => (
                    <View key={reply.id} style={styles.replyCard}>
                      <View style={styles.replyHeader}>
                        <View style={styles.replyAuthorInfo}>
                          <View style={styles.replyAvatarContainer}>
                            <User size={12} color='#667eea' strokeWidth={2} />
                          </View>
                          <Text style={styles.replyAuthorName}>{reply.author}</Text>
                        </View>
                        <Text style={styles.replyTime}>{reply.createdAt}</Text>
                      </View>
                      <Text style={styles.replyContent}>{reply.content}</Text>
                      <TouchableOpacity
                        style={styles.replyLikeButton}
                        onPress={() => handleLikeReply(reply.id)}
                      >
                        <Heart size={12} color='#ef4444' strokeWidth={2} />
                        <Text style={styles.replyLikesText}>{reply.likes}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <View style={styles.replyInputContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder={`Reply to ${comment.author}...`}
                    value={newReply}
                    onChangeText={setNewReply}
                    multiline
                    maxLength={300}
                  />
                  <View style={styles.replyInputActions}>
                    <TouchableOpacity
                      style={styles.cancelReplyButton}
                      onPress={() => {
                        setReplyingTo(null);
                        setNewReply('');
                      }}
                    >
                      <Text style={styles.cancelReplyText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sendReplyButton,
                        !newReply.trim() && styles.sendReplyButtonDisabled,
                      ]}
                      onPress={handleAddReply}
                      disabled={!newReply.trim()}
                    >
                      <Send size={16} color='#ffffff' strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Add Comment Section */}
        <View style={styles.addCommentSection}>
          <Text style={styles.addCommentTitle}>Add a Comment</Text>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder='Share your thoughts or ask a follow-up question...'
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
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
    borderRadius: 20,
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
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  commentLikesText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginLeft: 4,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  replyButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#667eea',
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#f3f4f6',
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
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
    lineHeight: 16,
    marginBottom: 6,
  },
  replyLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  replyLikesText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginLeft: 3,
  },
  replyInputContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
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
    maxHeight: 80,
    marginBottom: 8,
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelReplyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  sendReplyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendReplyButtonDisabled: {
    opacity: 0.5,
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
});
