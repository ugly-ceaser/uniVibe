import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { ErrorMessage } from '@/components/ErrorMessage';
import { GuideCard } from '@/components/GuideCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { guideApi, useApi } from '@/utils/api';
import { useState } from 'react';
import { Category, Guide } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const api = useApi();

  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guideClient = React.useMemo(() => guideApi(api), [api]);

  const fetchGuides = useCallback(
    async (isRefresh = false) => {
      if (!guideClient?.getAll) {
        setError('API not available');
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        console.log('🌐 Fetching guides...');
        const response: any = await guideClient.getAll();
        console.log('📊 Guides API Response:', {
          hasData: !!response?.data,
          dataLength: response?.data?.length,
          response: response,
        });

        if (response && response.data && Array.isArray(response.data)) {
          const transformedGuides = response.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            description:
              item.content?.substring(0, 120) + '...' ||
              'No description available',
            category: 'Academics' as Category,
            readTime: `${Math.ceil((item.content?.split(' ').length || 0) / 200)} min read`,
            likes: item.likesCount || 0,
            author: 'UniVibe Team',
            createdAt: item.createdAt,
            status: item.status,
          }));
          console.log('✅ Transformed guides:', transformedGuides.length);
          setGuides(transformedGuides);
        } else {
          console.warn('⚠️ No valid data in response:', response);
          setGuides([]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load guides';
        setError(errorMessage);
        setGuides(null);
        console.error('Error fetching guides:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [guideClient]
  );

  useEffect(() => {
    console.log('HomeScreen mounted, fetching guides...');
    fetchGuides();
  }, [fetchGuides]);

  // Add this to see state changes
  useEffect(() => {
    console.log('Guides state updated:', {
      guides,
      loading,
      refreshing,
      error,
    });
  }, [guides, loading, refreshing, error]);

  const onRefresh = useCallback(() => {
    fetchGuides(true);
  }, [fetchGuides]);

  const handleGuidePress = (guideId: string) => {
    router.push(`/guide/${guideId}`);
  };

  if (loading && !refreshing) {
    return <LoadingState title='Loading guides!!!...' />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={onRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
          guides && guides.length === 0
            ? styles.emptyContentContainer
            : undefined
        }
      >
        {guides && guides.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={64} color='#9ca3af' strokeWidth={1.5} />}
            title='No Guides Available'
            subtitle='No guides found. Pull down to refresh.'
          />
        ) : (
          <View style={styles.guidesContainer}>
            {guides &&
              guides.map(guide => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  onPress={() => handleGuidePress(guide.id)}
                />
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Extracted Header component
const Header = () => (
  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
    <Text style={styles.headerTitle}>Welcome to UniVibe</Text>
    <Text style={styles.headerSubtitle}>
      Discover guides to enhance your university experience
    </Text>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  guidesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
