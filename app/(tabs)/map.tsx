import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, ExternalLink, Building, Chrome as Home, Coffee, FlaskConical, CreditCard, BookOpen, Settings, Gamepad2 } from 'lucide-react-native';
import { campusLocations, CampusLocation } from '@/data/campusLocations';

const categoryIcons = {
  'Lecture Hall': Building,
  'Hostel': Home,
  'Cafeteria': Coffee,
  'Lab': FlaskConical,
  'ATM': CreditCard,
  'Library': BookOpen,
  'Admin': Settings,
  'Recreation': Gamepad2,
};

const categoryColors = {
  'Lecture Hall': ['#667eea', '#764ba2'],
  'Hostel': ['#f093fb', '#f5576c'],
  'Cafeteria': ['#4facfe', '#00f2fe'],
  'Lab': ['#43e97b', '#38f9d7'],
  'ATM': ['#fa709a', '#fee140'],
  'Library': ['#a8edea', '#fed6e3'],
  'Admin': ['#ffecd2', '#fcb69f'],
  'Recreation': ['#ff9a9e', '#fecfef'],
};

export default function MapScreen() {
  const [selectedCategory, setSelectedCategory] = useState<CampusLocation['category'] | 'All'>('All');

  const categories: (CampusLocation['category'] | 'All')[] = [
    'All', 'Lecture Hall', 'Hostel', 'Cafeteria', 'Lab', 'ATM', 'Library', 'Admin', 'Recreation'
  ];

  const filteredLocations = selectedCategory === 'All' 
    ? campusLocations 
    : campusLocations.filter(location => location.category === selectedCategory);

  const handleOpenMaps = async (location: CampusLocation) => {
    try {
      const supported = await Linking.canOpenURL(location.googleMapsUrl);
      if (supported) {
        await Linking.openURL(location.googleMapsUrl);
      } else {
        Alert.alert('Error', 'Cannot open Google Maps');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open Google Maps');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Campus Map</Text>
        <Text style={styles.headerSubtitle}>Find your way around campus</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.activeCategoryButton,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.activeCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Locations List */}
        <View style={styles.locationsContainer}>
          {filteredLocations.map((location) => {
            const IconComponent = categoryIcons[location.category];
            const colors = categoryColors[location.category];
            
            return (
              <View key={location.id} style={styles.locationCard}>
                <LinearGradient
                  colors={colors}
                  style={styles.locationIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconComponent size={24} color="#ffffff" strokeWidth={2} />
                </LinearGradient>
                
                <View style={styles.locationContent}>
                  <View style={styles.locationHeader}>
                    <Text style={styles.locationCategory}>{location.category}</Text>
                    <MapPin size={16} color="#9ca3af" strokeWidth={2} />
                  </View>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationDescription} numberOfLines={2}>
                    {location.description}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.mapsButton}
                    onPress={() => handleOpenMaps(location)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={16} color="#667eea" strokeWidth={2} />
                    <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  categoryContainer: {
    marginVertical: 20,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeCategoryButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  activeCategoryText: {
    color: '#ffffff',
  },
  locationsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationContent: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mapsButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
    marginLeft: 6,
  },
});