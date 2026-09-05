import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Search,
  X,
  RefreshCw,
} from 'lucide-react-native';
import { useApi, mapApi } from '@/utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { HeroBanner } from '@/components/HeroBanner';
import { FilterPill } from '@/components/FilterPill';
import { ScrollableScreen } from '@/components/ScrollableScreen';
import { TabTransitionWrapper } from '@/components/TabTransitionWrapper';

interface MapLocation {
  id: string;
  name: string;
  coordinates: { latitude: number; longitude: number };
  description?: string;
  category?: string;
  status: string;
  createdAt: string;
}

// Icon box colours per category
const CATEGORY_COLORS: Record<string, string> = {
  General: '#C4FF0E',
  'Lecture Hall': '#FFD93D',
  Library: '#6BCB77',
  Hostel: '#FF6B9D',
  Cafeteria: '#FF9F45',
  Admin: '#4D96FF',
};

function getCategoryColor(cat?: string) {
  return CATEGORY_COLORS[cat ?? 'General'] ?? '#C4FF0E';
}

function getCategoryEmoji(cat?: string) {
  const map: Record<string, string> = {
    General: '🏛',
    'Lecture Hall': '📚',
    Library: '📖',
    Hostel: '🏠',
    Cafeteria: '🍽',
    Admin: '🏢',
  };
  return map[cat ?? 'General'] ?? '📍';
}

export default function MapScreen() {
  const api = useApi();
  const apiClient = useMemo(() => mapApi(api), [api]);

  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const hasInitialLoaded = useRef(false);
  const isMountedRef = useRef(true);

  // ─── Data fetching ───────────────────────────────────────────────────────────
  const fetchLocations = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh && hasInitialLoaded.current) return;
      if (!apiClient?.getAll) {
        setError('API not available');
        setLoading(false);
        hasInitialLoaded.current = true;
        return;
      }
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);

        const response = await apiClient.getAll();
        if (!isMountedRef.current) return;

        if (response?.data && Array.isArray(response.data)) {
          setLocations(
            response.data.map((item: any) => ({
              id: item.id || item._id,
              name: item.name || 'Unnamed Location',
              coordinates: {
                latitude: parseFloat(item.coordinates?.latitude) || 0,
                longitude: parseFloat(item.coordinates?.longitude) || 0,
              },
              description: item.description || 'Campus location',
              category: item.category || 'General',
              status: item.status || 'active',
              createdAt: item.createdAt || new Date().toISOString(),
            }))
          );
        } else {
          setLocations([]);
        }
        hasInitialLoaded.current = true;
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load locations'
        );
        setLocations([]);
        hasInitialLoaded.current = true;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [apiClient]
  );

  const handleRefresh = useCallback(
    () => fetchLocations(true),
    [fetchLocations]
  );

  useEffect(() => {
    if (!hasInitialLoaded.current) fetchLocations(false);
  }, [fetchLocations]);

  useFocusEffect(
    useCallback(() => {
      if (!hasInitialLoaded.current) fetchLocations(false);
    }, [fetchLocations])
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Maps helpers ─────────────────────────────────────────────────────────────
  const openInMaps = async (location: MapLocation) => {
    const { latitude, longitude } = location.coordinates;
    const url = Platform.select({
      ios: `maps://maps.google.com/?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(
        location.name
      )})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    const fallback = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    try {
      if (url && (await Linking.canOpenURL(url))) await Linking.openURL(url);
      else await Linking.openURL(fallback);
    } catch {
      Alert.alert('Error', 'Could not open maps');
    }
  };

  const getDirections = async (location: MapLocation) => {
    const { latitude, longitude } = location.coordinates;
    const url = Platform.select({
      ios: `maps://maps.google.com/?daddr=${latitude},${longitude}&directionsmode=walking`,
      android: `google.navigation:q=${latitude},${longitude}&mode=w`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`,
    });
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    try {
      if (url && (await Linking.canOpenURL(url))) await Linking.openURL(url);
      else await Linking.openURL(fallback);
    } catch {
      Alert.alert('Error', 'Could not open directions');
    }
  };

  // ─── Derived data & Filtering ────────────────────────────────────────────────
  const categories = useMemo(
    () => [
      ...new Set(locations.map(l => l.category).filter(Boolean) as string[]),
    ],
    [locations]
  );

  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return locations.filter(l => {
      const matchesCategory =
        !selectedCategory || l.category === selectedCategory;
      const matchesQuery =
        !query ||
        l.name.toLowerCase().includes(query) ||
        (l.description && l.description.toLowerCase().includes(query)) ||
        (l.category && l.category.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [locations, selectedCategory, searchQuery]);

  // ── Hero banner ──────────────────────────────────────────────────────────────
  const hero = (
    <HeroBanner
      badgeText="WAYFINDING"
      title={'Where to\nnext? 📍'}
      subtitle="Every building, office, and hangout spot on campus."
    />
  );

  // ── Search & Filter section header ───────────────────────────────────────────
  const searchSection = (
    <View style={styles.searchSectionWrapper}>
      <View style={styles.searchContainer}>
        <Search size={18} color="#6B7280" strokeWidth={2.2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search campus buildings, labs, hostels…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color="#4B5563" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ── Filter chip row ──────────────────────────────────────────────────────────
  const chipItems = useMemo(
    () => [
      { key: null, label: `All · ${locations.length}` },
      ...categories.map(c => ({
        key: c,
        label: `${c} · ${locations.filter(l => l.category === c).length}`,
      })),
    ],
    [categories, locations]
  );

  const filterChips =
    categories.length > 0 || locations.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      >
        {chipItems.map(item => (
          <FilterPill
            key={item.key ?? '__all__'}
            label={item.label}
            isActive={item.key === selectedCategory}
            onPress={() => setSelectedCategory(item.key)}
          />
        ))}
      </ScrollView>
    ) : null;

  // ── Empty / error state ───────────────────────────────────────────────────────
  const emptyComponent = loading ? (
    <View style={styles.loadingBox}>
      <ActivityIndicator size="large" color="#7B2FBE" />
      <Text style={styles.loadingText}>Loading locations…</Text>
    </View>
  ) : error ? (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchLocations(true)}
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  ) : searchQuery.trim().length > 0 || selectedCategory !== null ? (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={styles.emptyTitle}>No locations found</Text>
      <Text style={styles.emptySubtitle}>
        No campus spots match &ldquo;{searchQuery || selectedCategory}&rdquo;. Try another
        search or reset filters.
      </Text>
      <TouchableOpacity
        style={styles.resetFilterButton}
        onPress={() => {
          setSearchQuery('');
          setSelectedCategory(null);
        }}
      >
        <Text style={styles.resetFilterButtonText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>🗺️</Text>
      <Text style={styles.emptyTitle}>No campus spots yet</Text>
      <Text style={styles.emptySubtitle}>
        Official campus landmarks and waypoints will appear here once added by
        administrators.
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => fetchLocations(true)}
      >
        <RefreshCw size={15} color="#000" strokeWidth={2.2} />
        <Text style={styles.refreshButtonText}>Refresh Map</Text>
      </TouchableOpacity>
    </View>
  );

  // ── renderItem ───────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item: location }: { item: MapLocation }) => (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert(location.name, location.description, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'View on Map', onPress: () => openInMaps(location) },
              { text: 'Directions', onPress: () => getDirections(location) },
            ])
          }
        >
          {/* Top row */}
          <View style={styles.cardHeader}>
            {/* Icon box */}
            <View
              style={[
                styles.iconBox,
                { backgroundColor: getCategoryColor(location.category) },
              ]}
            >
              <Text style={styles.iconEmoji}>
                {getCategoryEmoji(location.category)}
              </Text>
            </View>

            {/* Name + category */}
            <View style={styles.cardInfo}>
              <Text style={styles.locationName} numberOfLines={1}>
                {location.name}
              </Text>
              {location.category && (
                <Text style={styles.locationCategory}>
                  {location.category.toUpperCase()}
                </Text>
              )}
            </View>

            {/* External link icon */}
            <TouchableOpacity
              style={styles.externalBtn}
              onPress={() => openInMaps(location)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ExternalLink size={14} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {location.description ? (
            <Text style={styles.locationDesc} numberOfLines={2}>
              {location.description}
            </Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openInMaps(location)}
            >
              <MapPin size={13} color="#000" />
              <Text style={styles.actionBtnText}>View on map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => getDirections(location)}
            >
              <Navigation size={13} color="#000" />
              <Text style={styles.actionBtnText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  return (
    <TabTransitionWrapper>
      <ScrollableScreen
        hero={hero}
        sectionHeader={searchSection}
        filterChips={filterChips ?? <View />}
        stickyChips={chipItems.length > 1}
        data={filteredLocations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7B2FBE"
          />
        }
      />
    </TabTransitionWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Search Bar ───
  searchSectionWrapper: {
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0D0D0D',
    fontWeight: '600',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },

  // ─── Filter Pills ───
  filterList: { gap: 10, paddingHorizontal: 16, paddingVertical: 2 },

  // ─── Loading ───
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 40,
  },
  loadingText: { fontSize: 14, color: '#555', fontWeight: '600' },

  // ─── Error ───
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
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
  retryButtonText: { fontSize: 13, fontWeight: '800', color: '#000' },

  // ─── Empty ───
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D0D0D',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetFilterButton: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  resetFilterButtonText: { fontSize: 13, fontWeight: '900', color: '#000' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  refreshButtonText: { fontSize: 13, fontWeight: '900', color: '#000' },

  // ─── Location Cards ───
  cardWrapper: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  locationName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D0D0D',
    marginBottom: 2,
  },
  locationCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7B2FBE',
    letterSpacing: 0.6,
  },
  externalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDesc: { fontSize: 13, color: '#555', lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  actionBtnSecondary: { backgroundColor: '#F5F5F5' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#0D0D0D' },
});
