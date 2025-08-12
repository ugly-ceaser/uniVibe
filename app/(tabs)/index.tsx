import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Users,
  DollarSign,
  Shield,
  ChevronRight,
} from 'lucide-react-native';
import { survivalTips, SurvivalTip } from '@/data/survivalTips';

const categoryIcons = {
  Academics: BookOpen,
  'Social Life': Users,
  Budgeting: DollarSign,
  Safety: Shield,
};

const categoryColors = {
  Academics: ['#667eea', '#764ba2'],
  'Social Life': ['#f093fb', '#f5576c'],
  Budgeting: ['#4facfe', '#00f2fe'],
  Safety: ['#43e97b', '#38f9d7'],
};

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<
    SurvivalTip['category'] | 'All'
  >('All');

  const categories: (SurvivalTip['category'] | 'All')[] = [
    'All',
    'Academics',
    'Social Life',
    'Budgeting',
    'Safety',
  ];

  const filteredTips =
    selectedCategory === 'All'
      ? survivalTips
      : survivalTips.filter(tip => tip.category === selectedCategory);

  const handleTipPress = (tip: SurvivalTip) => {
    router.push({
      pathname: '/tip-detail',
      params: { tipId: tip.id },
    });
  };

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
          {filteredTips.map(tip => {
            const IconComponent = categoryIcons[tip.category];
            const colors = categoryColors[tip.category];

            return (
              <TouchableOpacity
                key={tip.id}
                style={styles.tipCard}
                onPress={() => handleTipPress(tip)}
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
                    <Text style={styles.tipCategory}>{tip.category}</Text>
                    <Text style={styles.readTime}>{tip.readTime}</Text>
                  </View>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDescription} numberOfLines={2}>
                    {tip.description}
                  </Text>
                </View>

                <ChevronRight size={20} color='#9ca3af' strokeWidth={2} />
              </TouchableOpacity>
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
});
