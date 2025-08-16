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
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Users,
  DollarSign,
  Shield,
  ChevronRight,
  Heart,
  LucideIcon,
} from 'lucide-react-native';
import { useApi, guideApi } from '@/utils/api'; // Add this import
import { Category, Guide } from '@/types/guide';
import { ApiResponse } from '@/types/api';

const categoryIcons: Record<Category, LucideIcon> = {
  Academics: BookOpen,
  'Social Life': Users,
  Budgeting: DollarSign,
  Safety: Shield,
};

const categoryColors: Record<Category, [string, string]> = {
  Academics: ['#667eea', '#764ba2'],
  'Social Life': ['#f093fb', '#f5576c'],
  Budgeting: ['#4facfe', '#00f2fe'],
  Safety: ['#43e97b', '#38f9d7'],
};

export default function HomeScreen() {
  const router = useRouter();
  const api = useApi(); // Add this hook
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    string | 'All'
  >('All');

  const categories = [
    'All',
    'Academics',
    'Social Life',
    'Budgeting',
    'Safety',
  ];

  const apiClient = React.useMemo(() => guideApi(api), [api]); // Create API client instance

  React.useEffect(() => {
    const fetchGuides = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAll() as { data: Guide[] };
        setGuides(response.data || []);
      } catch (error) {
        console.error('Error fetching guides:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, [apiClient]);

  const filteredGuides =
    selectedCategory === 'All'
      ? guides
      : guides.filter(guide => guide.category === selectedCategory);

  const handleGuidePress = (guide: any) => {
    router.push({
      pathname: '/tip-detail',
      params: { tipId: guide.id },
    });
  };

  const handleLikeGuide = async (guideId: string) => {
    try {
      // Update local state optimistically
      setGuides(prev => 
        prev.map(g => 
          g.id === guideId 
            ? { ...g, likes: (g.likes || 0) + 1 }
            : g
        )
      );
      
      await apiClient.like(guideId);
      Alert.alert('Success', 'Guide liked!');
    } catch (error) {
      console.error('Error liking guide:', error);
      // Revert optimistic update on error
      setGuides(prev => 
        prev.map(g => 
          g.id === guideId 
            ? { ...g, likes: Math.max((g.likes || 1) - 1, 0) }
            : g
        )
      );
    }
  };

  const renderGuide = (guide: Guide) => {
    const IconComponent = categoryIcons[guide.category];
    const colors = categoryColors[guide.category];
    
    return (
      <TouchableOpacity
        key={guide.id}
        style={styles.tipCard}
        onPress={() => handleGuidePress(guide)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={colors}
          style={styles.tipIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <IconComponent size={24} color='#ffffff' strokeWidth={2} />
        </LinearGradient>

        <View style={styles.tipContent}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipCategory}>{guide.category}</Text>
            <Text style={styles.readTime}>{guide.readTime || '3 min read'}</Text>
          </View>
          <Text style={styles.tipTitle}>{guide.title}</Text>
          <Text style={styles.tipDescription} numberOfLines={2}>
            {guide.description}
          </Text>

          <View style={styles.tipFooter}>
            <TouchableOpacity
              style={styles.tipLikeButton}
              onPress={() => handleLikeGuide(guide.id)}
            >
              <Heart size={16} color='#ef4444' strokeWidth={2} />
              <Text style={styles.tipLikesText}>{guide.likes || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ChevronRight size={20} color='#9ca3af' strokeWidth={2} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <Text style={styles.headerTitle}>Survival Guide</Text>
          <Text style={styles.headerSubtitle}>
            Tips for your first year success
          </Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading survival tips...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Survival Guide</Text>
        <Text style={styles.headerSubtitle}>
          Tips for your first year success
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map(category => (
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

        {/* Tips List */}
        <View style={styles.tipsContainer}>
          {filteredGuides.map(guide => renderGuide(guide))}
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
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  activeCategoryText: {
    color: '#ffffff',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tipCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  readTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
  },
  tipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tipLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  tipLikesText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    marginLeft: 4,
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
});
