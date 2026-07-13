import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, Sparkles } from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { GuideCard } from '@/components/GuideCard';
import { guideApi, useApi } from '@/utils/api';
import { Category, Guide } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollHeader } from '@/hooks/useScrollHeader';

const FILTER_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'For you' },
  { key: 'Academics', label: 'Academics' },
  { key: 'Social', label: 'Campus' },
  { key: 'Financial', label: 'Finance' },
  { key: 'Safety', label: 'Safety' },
];

export default function HomeScreen() {
  const router = useRouter();
  const api = useApi();
  const { user } = useAuth();

  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const guideClient = useMemo(() => guideApi(api), [api]);
  const { headerAnim, onScroll, headerMaxHeight } = useScrollHeader();

  const fetchGuides = useCallback(
    async (isRefresh = false) => {
      if (!guideClient?.getAll) {
        setError('API not available');
        setLoading(false);
        return;
      }
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const response: any = await guideClient.getAll();

        if (response?.data && Array.isArray(response.data)) {
          const transformed = response.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            description:
              item.content?.substring(0, 120) + '...' ||
              'No description available',
            category: 'Academics' as Category,
            readTime: `${Math.ceil(
              (item.content?.split(' ').length || 0) / 200
            )} min read`,
            likes: item.likesCount || 0,
            author: 'UniVibe Team',
            createdAt: item.createdAt,
            status: item.status,
          }));
          setGuides(transformed);
        } else {
          setGuides([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load guides');
        setGuides(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [guideClient]
  );

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const onRefresh = useCallback(() => fetchGuides(true), [fetchGuides]);

  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    if (selectedCategory === 'all') return guides;
    return guides.filter(g => g.category === selectedCategory);
  }, [guides, selectedCategory]);

  const handleGuidePress = (guideId: string) => {
    router.push(`/guide/${guideId}`);
  };

  // Derive first name for greeting
  const firstName = user?.fullname?.split(' ')[0] ?? 'there';

  if (loading && !refreshing) {
    return <LoadingState title='Loading guides...' />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#7B2FBE'
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Collapsible: Hero Banner + Filter Pills ─── */}
        <Animated.View
          style={{
            opacity: headerAnim,
            maxHeight: headerMaxHeight(390),
            overflow: 'hidden',
          }}
        >
          {/* Hero Banner Card */}
          <View style={styles.heroBannerWrapper}>
            <LinearGradient
              colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.decorCircle} />
              <View style={styles.heroBannerTop}>
                <View style={styles.seasonBadge}>
                  <Text style={styles.seasonBadgeText}>CAMPUS SEASON</Text>
                </View>
                <TouchableOpacity
                  style={styles.sparkleButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sparkleButtonText}>✶</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.heroHeading}>
                Hey {firstName},{'\n'}let's vibe check{'\n'}your semester
              </Text>
              <Text style={styles.heroEmoji}>✶✧</Text>
              <Text style={styles.heroSubtitle}>
                Fresh guides, drops, and hacks to make uni actually make sense.
              </Text>
            </LinearGradient>
          </View>

          {/* Filter Category Pills */}
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              data={FILTER_CATEGORIES}
              keyExtractor={item => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => {
                const isActive = item.key === selectedCategory;
                return (
                  <TouchableOpacity
                    style={[
                      styles.filterPill,
                      isActive && styles.filterPillActive,
                    ]}
                    onPress={() => setSelectedCategory(item.key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive && styles.filterPillTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Animated.View>

        {/* ─── Trending Section ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending rn</Text>
          <TouchableOpacity>
            <Text style={styles.sectionSeeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Guide Cards ─── */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchGuides()}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredGuides.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={56} color='#9ca3af' strokeWidth={1.5} />}
            title='No Guides Yet'
            subtitle='Pull down to refresh and check back soon.'
          />
        ) : (
          <View style={styles.guidesContainer}>
            {filteredGuides.map((guide, index) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                isHot={index < 2}
                onPress={() => handleGuidePress(guide.id)}
              />
            ))}
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ─── Hero Banner ───
  heroBannerWrapper: {
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    // Offset shadow
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroBanner: {
    borderRadius: 22,
    padding: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -30,
    right: -30,
  },
  heroBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seasonBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  sparkleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  sparkleButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  heroHeading: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 4,
  },
  heroEmoji: {
    fontSize: 22,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ─── Filter Pills ───
  filterSection: {
    marginBottom: 22,
  },
  filterList: {
    paddingVertical: 4,
    gap: 10,
  },
  filterPill: {
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#0D0D0D',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  filterPillTextActive: {
    color: '#C4FF0E',
  },

  // ─── Section Header ───
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D0D0D',
  },
  sectionSeeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7B2FBE',
  },

  // ─── Guides ───
  guidesContainer: {
    paddingTop: 6,
  },

  // ─── Error State ───
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },
});
