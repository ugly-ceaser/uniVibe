import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Users,
  DollarSign,
  Shield,
  Heart,
  LucideIcon,
} from 'lucide-react-native';
import { ApiError, guideApi, useApi, ApiInstance, mapApiClient } from '@/utils/api';
import { Guide } from '@/types/guide';
import { useAsync } from '@/hooks/useAsync';
import { ErrorMessage } from '@/components/ErrorMessage';

type CategoryType = 'Academics' | 'Social Life' | 'Budgeting' | 'Safety';

const categoryIcons: Record<CategoryType, LucideIcon> = {
  Academics: BookOpen,
  'Social Life': Users,
  Budgeting: DollarSign,
  Safety: Shield,
};

const categoryColors = {
  Academics: ['#667eea', '#764ba2'] as const,
  'Social Life': ['#f093fb', '#f5576c'] as const,
  Budgeting: ['#4facfe', '#00f2fe'] as const,
  Safety: ['#43e97b', '#38f9d7'] as const,
};

export default function TipDetailScreen() {
  const { tipId } = useLocalSearchParams();
  const [error, setError] = useState(false);

  const api = useApi();
  const apiClient = React.useMemo(() => guideApi(api), [api]);
  const { data: guide, loading, error: fetchError, execute } = useAsync<Guide>();

  React.useEffect(() => {
    const id = Array.isArray(tipId) ? tipId[0] : tipId;
    if (id) {
      execute(() => apiClient.getById(id).then(res => res.data as Guide));
    }
  }, [tipId, execute]);

  const handleLike = async () => {
    try {
      await apiClient.getLikesCount(tipId as string);
      // Update UI optimistically
    } catch (err) {
      // Revert optimistic update
      if (err instanceof ApiError) {
        Alert.alert('Error', err.message);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading guide...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return <ErrorMessage message={fetchError} onRetry={() => execute(() => apiClient.getById(tipId as string).then(res => res.data))} />;
  }

  if (!guide) {
    return <ErrorMessage message="Guide not found" />;
  }

  const IconComponent = categoryIcons[guide.category as CategoryType] || BookOpen;
  const colors = categoryColors[guide.category as CategoryType] || (['#667eea', '#764ba2'] as const);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color='#ffffff' strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <IconComponent size={32} color='#ffffff' strokeWidth={2} />
          </View>
          <Text style={styles.category}>{guide.category}</Text>
          <Text style={styles.title}>{guide.title}</Text>
          <View style={styles.readTimeContainer}>
            <Clock size={16} color='rgba(255, 255, 255, 0.8)' strokeWidth={2} />
            <Text style={styles.readTime}>{guide.readTime || '3 min read'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={styles.description}>{guide.description}</Text>
          <Text style={styles.contentText}>{guide.content}</Text>

          <View style={styles.tipActions}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLike}
            >
              <Heart size={20} color='#ef4444' strokeWidth={2} />
              <Text style={styles.likesText}>{guide.likes || 0} likes</Text>
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
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  category: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  readTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  description: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    lineHeight: 26,
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
  },
  tipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 20,
  },
  likesText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ef4444',
    marginLeft: 6,
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
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 50,
  },
});

