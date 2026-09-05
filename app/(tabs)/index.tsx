import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { GuideCard } from '@/components/GuideCard';
import { HeroBanner } from '@/components/HeroBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { FilterPill } from '@/components/FilterPill';
import { ScrollableScreen } from '@/components/ScrollableScreen';
import { TabTransitionWrapper } from '@/components/TabTransitionWrapper';
import { guideApi, useApi } from '@/utils/api';
import { Guide } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const FILTER_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'For you' },
  { key: 'Academics', label: 'Academics' },
  { key: 'Social Life', label: 'Campus' },
  { key: 'Budgeting', label: 'Finance' },
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

        const response = await guideClient.getAll();

        if (response?.data && Array.isArray(response.data)) {
          setGuides(response.data);
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
    return <LoadingState skeleton={4} />;
  }

  // ── Hero banner ──────────────────────────────────────────────────────────────
  const hero = (
    <>
      <HeroBanner
        badgeText="CAMPUS SEASON"
        title={`Hey ${firstName},\nlet's vibe check ✨`}
        subtitle="Fresh guides, drops, and hacks to make uni actually make sense."
        rightAction={<NotificationBell />}
      />

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Latest guides</Text>
        {selectedCategory !== 'all' ? (
          <TouchableOpacity onPress={() => setSelectedCategory('all')}>
            <Text style={styles.sectionSeeAll}>See all →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );

  // ── Horizontal filter chip row ───────────────────────────────────────────────
  const filterChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterList}
    >
      {FILTER_CATEGORIES.map(item => (
        <FilterPill
          key={item.key}
          label={item.label}
          isActive={item.key === selectedCategory}
          onPress={() => setSelectedCategory(item.key)}
        />
      ))}
    </ScrollView>
  );

  // ── Error state (shown as empty component) ────────────────────────────────────
  const emptyOrError = error ? (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchGuides()}
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <EmptyState
      icon={<BookOpen size={56} color='#9ca3af' strokeWidth={1.5} />}
      title='No Guides Yet'
      subtitle='Pull down to refresh and check back soon.'
    />
  );

  return (
    <TabTransitionWrapper>
      <ScrollableScreen
        hero={hero}
        filterChips={filterChips}
        data={filteredGuides}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <GuideCard
            guide={item}
            isHot={item.isFeatured}
            onPress={() => handleGuidePress(item.id)}
          />
        )}
        ListEmptyComponent={emptyOrError}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#7B2FBE'
          />
        }
      />
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
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

  // ─── Filter Pills ───
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },

  // ─── Section Header ───
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
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
