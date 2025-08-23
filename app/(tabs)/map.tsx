import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation, ExternalLink, Filter, Plus } from 'lucide-react-native';
import { useApi, mapApi } from '@/utils/api';
import { useFocusEffect } from '@react-navigation/native';

// Types for your map locations
interface MapLocation {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  category?: string;
  status: string;
  createdAt: string;
}

export default function MapScreen() {
  const api = useApi();
  const apiClient = React.useMemo(() => mapApi(api), [api]);

  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Track if we've made the initial request
  const hasInitialLoaded = useRef(false);
  const isMountedRef = useRef(true);

  // Fetch locations from API
  const fetchLocations = useCallback(async (isRefresh = false) => {
    // If not a refresh and we already loaded, don't fetch again
    if (!isRefresh && hasInitialLoaded.current) {
      console.log('⏭️ Skipping fetch - already loaded');
      return;
    }

    if (!apiClient?.getAll) {
      setError('API not available');
      if (!hasInitialLoaded.current) {
        setLoading(false);
        hasInitialLoaded.current = true;
      }
      return;
    }

    try {
      if (isRefresh) {
        console.log('🔄 Refreshing locations...');
        setRefreshing(true);
      } else {
        console.log('📱 Initial loading of locations...');
        setLoading(true);
      }
      setError(null);

      const response = await apiClient.getAll();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      console.log('📍 Map API Response:', response?.data?.length || 0, 'locations');

      if (response?.data && Array.isArray(response.data)) {
        const transformedLocations: MapLocation[] = response.data.map((item: any) => ({
          id: item.id || item._id,
          name: item.name || 'Unnamed Location',
          coordinates: {
            latitude: parseFloat(item.coordinates?.latitude) || parseFloat(item.latitude) || 0,
            longitude: parseFloat(item.coordinates?.longitude) || parseFloat(item.longitude) || 0,
          },
          description: item.description || 'Campus location',
          category: item.category || 'General',
          status: item.status || 'active',
          createdAt: item.createdAt || new Date().toISOString(),
        }));

        setLocations(transformedLocations);
        console.log('✅ Loaded', transformedLocations.length, 'map locations');
        
        if (transformedLocations.length === 0) {
          console.log('📍 Database is empty - no locations found');
        }
      } else {
        setLocations([]);
        console.log('📍 No map locations found or invalid response format');
      }

      // Mark as initially loaded
      if (!hasInitialLoaded.current) {
        hasInitialLoaded.current = true;
      }

    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Failed to load locations';
      setError(errorMessage);
      console.error('💥 Error fetching locations:', err);
      setLocations([]);
      
      // Still mark as loaded even if there's an error to prevent retries
      if (!hasInitialLoaded.current) {
        hasInitialLoaded.current = true;
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [apiClient]);

  // Handle manual refresh (pull to refresh)
  const handleRefresh = useCallback(() => {
    console.log('👆 User triggered refresh');
    fetchLocations(true);
  }, [fetchLocations]);

  // Load data only once on mount
  useEffect(() => {
    if (!hasInitialLoaded.current) {
      fetchLocations(false);
    }
  }, [fetchLocations]);

  // Focus effect to prevent unnecessary reloads when navigating between tabs
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 Map screen focused');
      // Only load if we haven't loaded yet
      if (!hasInitialLoaded.current) {
        fetchLocations(false);
      }
    }, [fetchLocations])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Open location in Google Maps
  const openInMaps = async (location: MapLocation) => {
    const { latitude, longitude } = location.coordinates;
    
    const googleMapsUrl = Platform.select({
      ios: `maps://maps.google.com/?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(location.name)})`,
      web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    try {
      if (googleMapsUrl) {
        const canOpen = await Linking.canOpenURL(googleMapsUrl);
        if (canOpen) {
          await Linking.openURL(googleMapsUrl);
        } else {
          await Linking.openURL(fallbackUrl);
        }
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Could not open maps');
    }
  };

  // Get directions to location
  const getDirections = async (location: MapLocation) => {
    const { latitude, longitude } = location.coordinates;
    
    const directionsUrl = Platform.select({
      ios: `maps://maps.google.com/?daddr=${latitude},${longitude}&directionsmode=walking`,
      android: `google.navigation:q=${latitude},${longitude}&mode=w`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`,
    });

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;

    try {
      if (directionsUrl) {
        const canOpen = await Linking.canOpenURL(directionsUrl);
        if (canOpen) {
          await Linking.openURL(directionsUrl);
        } else {
          await Linking.openURL(fallbackUrl);
        }
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert('Error', 'Could not open directions');
    }
  };

  // Handle location press
  const handleLocationPress = (location: MapLocation) => {
    Alert.alert(
      location.name,
      location.description || 'Campus location',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View on Map', onPress: () => openInMaps(location) },
        { text: 'Get Directions', onPress: () => getDirections(location) },
      ]
    );
  };

  // Add sample location (for testing) - this will trigger a refresh
  const addSampleLocation = () => {
    Alert.alert(
      'Add Sample Location',
      'This will help you test the map functionality with sample data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Sample', onPress: createSampleLocation },
      ]
    );
  };

  const createSampleLocation = async () => {
    if (!apiClient?.create) {
      Alert.alert('Error', 'Cannot create location - API not available');
      return;
    }

    try {
      const sampleLocation = {
        name: `Sample Location ${Date.now()}`, // Make it unique
        coordinates: {
          latitude: '40.7589',
          longitude: '-73.9851',
        },
        description: 'Sample campus location for testing',
        category: 'Academic',
      };

      console.log('Creating sample location:', sampleLocation);
      await apiClient.create(sampleLocation);
      
      Alert.alert('Success', 'Sample location added!');
      // Trigger a refresh to show the new location
      handleRefresh();
    } catch (error) {
      console.error('Error creating sample location:', error);
      Alert.alert('Error', 'Failed to create sample location');
    }
  };

  // Filter locations by category
  const filteredLocations = selectedCategory 
    ? locations.filter(loc => loc.category === selectedCategory)
    : locations;

  // Get unique categories
  const categories = [...new Set(locations.map(loc => loc.category).filter(Boolean))];

  // Initial loading state (only on first load)
  if (loading && !hasInitialLoaded.current) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <Text style={styles.headerTitle}>Campus Locations</Text>
          <Text style={styles.headerSubtitle}>Find places around campus</Text>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Campus Locations</Text>
        <Text style={styles.headerSubtitle}>
          {locations.length === 0 
            ? 'No locations available yet' 
            : `${filteredLocations.length} place${filteredLocations.length !== 1 ? 's' : ''} found`
          }
        </Text>
      </LinearGradient>

      {/* Category Filter */}
      {categories.length > 0 && (
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity 
              style={[styles.filterButton, !selectedCategory && styles.filterButtonActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.filterText, !selectedCategory && styles.filterTextActive]}>
                All ({locations.length})
              </Text>
            </TouchableOpacity>
            
            {categories.map((category) => {
              const count = locations.filter(loc => loc.category === category).length;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.filterButton, selectedCategory === category && styles.filterButtonActive]}
                  onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
                >
                  <Text style={[styles.filterText, selectedCategory === category && styles.filterTextActive]}>
                    {category} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Locations List */}
      <ScrollView 
        style={styles.locationsContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#667eea']} // Android
            tintColor="#667eea" // iOS
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Campus Locations Yet</Text>
            <Text style={styles.emptyText}>
              Looks like no locations have been added to the database yet.{'\n\n'}
              Pull down to refresh or add a sample location to test the functionality.
            </Text>
            
            <TouchableOpacity 
              style={styles.sampleButton}
              onPress={addSampleLocation}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.sampleButtonText}>Add Sample Location</Text>
            </TouchableOpacity>
          </View>
        ) : filteredLocations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Filter size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Locations in {selectedCategory}</Text>
            <Text style={styles.emptyText}>
              No locations found in the {selectedCategory} category.{'\n'}
              Try selecting a different category or view all locations.
            </Text>
          </View>
        ) : (
          <View style={styles.locationsList}>
            {filteredLocations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={styles.locationCard}
                onPress={() => handleLocationPress(location)}
                activeOpacity={0.7}
              >
                <View style={styles.locationContent}>
                  <View style={styles.locationHeader}>
                    <View style={styles.locationIcon}>
                      <MapPin size={20} color="#667eea" />
                    </View>
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      {location.category && (
                        <Text style={styles.locationCategory}>{location.category}</Text>
                      )}
                    </View>
                    <ExternalLink size={20} color="#9ca3af" />
                  </View>
                  
                  {location.description && (
                    <Text style={styles.locationDescription}>
                      {location.description}
                    </Text>
                  )}
                  
                  <View style={styles.locationActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        openInMaps(location);
                      }}
                    >
                      <MapPin size={14} color="#667eea" />
                      <Text style={styles.actionButtonText}>View on Map</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        getDirections(location);
                      }}
                    >
                      <Navigation size={14} color="#667eea" />
                      <Text style={styles.actionButtonText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={styles.bottomPadding} />
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
    paddingBottom: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  locationsContainer: {
    flex: 1,
  },
  locationsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationContent: {
    gap: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  locationCategory: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  locationDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sampleButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomPadding: {
    height: 20,
  },
});
