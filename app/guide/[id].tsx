import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share as NativeShare,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Share, Clock, User, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGuide } from '@/hooks/useGuide';
import { ErrorMessage } from '@/components/ErrorMessage';
import { guideApi, useApi } from '@/utils/api';

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const guideId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const api = useApi();
  const guideClient = React.useMemo(() => guideApi(api), [api]);
  const insets = useSafeAreaInsets();
  const { guide, loading, error, refetch, updateGuide } = useGuide(guideId);

  const [isLiked, setIsLiked] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(0);
  const [reactionPending, setReactionPending] = React.useState(false);

  React.useEffect(() => {
    if (guide) {
      setLikesCount(guide.likes);
      setIsLiked(guide.isLiked);
    }
  }, [guide]);

  const handleLike = async () => {
    if (!guide?.id || reactionPending) return;
    const previousLiked = isLiked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setReactionPending(true);
    try {
      const response = previousLiked
        ? await guideClient.unlike(guide.id)
        : await guideClient.like(guide.id);
      const confirmedLiked = response.data?.isLiked ?? nextLiked;
      const confirmedCount = response.data?.likes ?? nextCount;
      setIsLiked(confirmedLiked);
      setLikesCount(confirmedCount);
      updateGuide({ isLiked: confirmedLiked, likes: confirmedCount });
    } catch (error) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      Alert.alert(
        'Could not update like',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setReactionPending(false);
    }
  };

  const handleShare = async () => {
    if (!guide) return;
    try {
      await NativeShare.share({
        title: guide.title,
        message: `${guide.title}\n\n${guide.description || guide.content}`,
      });
    } catch (error) {
      Alert.alert(
        'Could not share guide',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color='#7B2FBE' />
          <Text style={styles.loadingText}>Loading guide...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ErrorMessage message={error} onRetry={refetch} />
        </View>
      ) : !guide ? (
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Guide not found</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <LinearGradient
            colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
            style={styles.guideHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.decorCircle} />

            {/* Top Bar */}
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <ArrowLeft size={20} color='#0D0D0D' strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{guide.category}</Text>
              </View>
            </View>

            <Text style={styles.guideTitle}>{guide.title}</Text>

            <View style={styles.guideMeta}>
              <View style={styles.metaPill}>
                <Clock size={14} color='rgba(255, 255, 255, 0.9)' />
                <Text style={styles.metaText}>{guide.readTime}</Text>
              </View>
              <View style={styles.metaPill}>
                <User size={14} color='rgba(255, 255, 255, 0.9)' />
                <Text style={styles.metaText}>{guide.author}</Text>
              </View>
              <View style={styles.metaPill}>
                <Heart size={14} color='rgba(255, 255, 255, 0.9)' />
                <Text style={styles.metaText}>{likesCount} likes</Text>
              </View>
            </View>

            {/* Like and Share buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleLike}
                style={[styles.actionButton, isLiked && styles.likedButton]}
                disabled={reactionPending}
                activeOpacity={0.8}
              >
                <Heart
                  size={18}
                  color={isLiked ? '#ffffff' : '#0D0D0D'}
                  fill={isLiked ? '#ffffff' : 'none'}
                />
                <Text style={[styles.actionText, isLiked && styles.likedText]}>
                  {reactionPending ? 'Saving…' : isLiked ? 'Liked' : 'Like'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={styles.actionButton}
                activeOpacity={0.8}
              >
                <Share size={18} color='#0D0D0D' />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Body Section */}
          <View style={styles.guideContent}>
            <Text style={styles.contentText}>{guide.content}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEFFF',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B21A8',
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  guideHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 2.5,
    borderBottomColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -20,
    right: -20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  categoryBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  guideTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 14,
    lineHeight: 34,
  },
  guideMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  likedButton: {
    backgroundColor: '#EF4444',
    borderColor: '#000000',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  likedText: {
    color: '#ffffff',
  },
  guideContent: {
    padding: 18,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1F2937',
    fontWeight: '500',
  },
});
