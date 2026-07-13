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
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation, ExternalLink, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi, mapApi } from '@/utils/api';
import { useFocusEffect } from '@react-navigation/native';

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

  const addSampleLocation = () => {
    Alert.alert(
      'Add Sample Location',
      'Add a sample location to test the map?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Sample',
          onPress: async () => {
            if (!apiClient?.create) {
              Alert.alert('Error', 'API not available');
              return;
            }
            try {
              await apiClient.create({
                name: `Sample Location ${Date.now()}`,
                coordinates: { latitude: 40.7589, longitude: -73.9851 },
                description: 'Sample campus location for testing',
                category: 'Recreation',
              });
              Alert.alert('Success', 'Sample location added!');
              handleRefresh();
            } catch {
              Alert.alert('Error', 'Failed to create sample location');
            }
          },
        },
      ]
    );
  };

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const categories = useMemo(
    () => [
      ...new Set(locations.map(l => l.category).filter(Boolean) as string[]),
    ],
    [locations]
  );

  const filteredLocations = useMemo(
    () =>
      selectedCategory
        ? locations.filter(l => l.category === selectedCategory)
        : locations,
    [locations, selectedCategory]
  );

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (loading && !hasInitialLoaded.current) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.heroBannerWrapper}>
          <LinearGradient
            colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.decorCircle} />
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>WAYFINDING</Text>
            </View>
            <Text style={styles.heroHeading}>Where to{'\n'}next? 📍</Text>
            <Text style={styles.heroSubtitle}>
              Every building, office, and hangout spot on campus.
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size='large' color='#7B2FBE' />
          <Text style={styles.loadingText}>Loading locations…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor='#7B2FBE'
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Hero Banner ─── */}
        <View style={styles.heroBannerWrapper}>
          <LinearGradient
            colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.decorCircle} />
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>WAYFINDING</Text>
            </View>
            <Text style={styles.heroHeading}>Where to{'\n'}next? 📍</Text>
            <Text style={styles.heroSubtitle}>
              Every building, office, and hangout spot on campus.
            </Text>
          </LinearGradient>
        </View>

        {/* ─── Filter Pills ─── */}
        {(categories.length > 0 || locations.length > 0) && (
          <FlatList
            horizontal
            data={[
              { key: null, label: `All · ${locations.length}` },
              ...categories.map(c => ({
                key: c,
                label: `${c} · ${
                  locations.filter(l => l.category === c).length
                }`,
              })),
            ]}
            keyExtractor={item => item.key ?? '__all__'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            style={styles.filterRow}
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
        )}

        {/* ─── Error ─── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchLocations(true)}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Empty ─── */}
        {!error && locations.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No locations yet</Text>
            <Text style={styles.emptySubtitle}>
              No campus spots have been added.{'\n'}Pull down to refresh or add
              a sample.
            </Text>
            <TouchableOpacity
              style={styles.sampleButton}
              onPress={addSampleLocation}
            >
              <Plus size={16} color='#000' />
              <Text style={styles.sampleButtonText}>Add Sample Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Location Cards ─── */}
        {!error && filteredLocations.length > 0 && (
          <View style={styles.locationsList}>
            {filteredLocations.map(location => (
              <View key={location.id} style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() =>
                    Alert.alert(location.name, location.description, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'View on Map',
                        onPress: () => openInMaps(location),
                      },
                      {
                        text: 'Directions',
                        onPress: () => getDirections(location),
                      },
                    ])
                  }
                >
                  {/* Top row */}
                  <View style={styles.cardHeader}>
                    {/* Icon box */}
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: getCategoryColor(location.category),
                        },
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
                      <ExternalLink size={14} color='#666' />
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
                      <MapPin size={13} color='#000' />
                      <Text style={styles.actionBtnText}>View on map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary]}
                      onPress={() => getDirections(location)}
                    >
                      <Navigation size={13} color='#000' />
                      <Text style={styles.actionBtnText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // ─── Hero Banner ───
  heroBannerWrapper: {
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
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
  seasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000',
    marginBottom: 14,
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 38,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ─── Filter Pills ───
  filterRow: { marginBottom: 20 },
  filterList: { gap: 10, paddingVertical: 2 },
  filterPill: {
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  filterPillActive: { backgroundColor: '#0D0D0D' },
  filterPillText: { fontSize: 13, fontWeight: '700', color: '#0D0D0D' },
  filterPillTextActive: { color: '#C4FF0E' },

  // ─── Loading ───
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  sampleButtonText: { fontSize: 13, fontWeight: '800', color: '#000' },

  // ─── Location Cards ───
  locationsList: { gap: 0 },
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
