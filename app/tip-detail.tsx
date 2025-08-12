import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Users,
  DollarSign,
  Shield,
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

export default function TipDetailScreen() {
  const router = useRouter();
  const { tipId } = useLocalSearchParams();

  const tip = survivalTips.find(t => t.id === tipId);

  if (!tip) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Tip not found</Text>
      </SafeAreaView>
    );
  }

  const IconComponent = categoryIcons[tip.category];
  const colors = categoryColors[tip.category];

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
          <Text style={styles.category}>{tip.category}</Text>
          <Text style={styles.title}>{tip.title}</Text>
          <View style={styles.readTimeContainer}>
            <Clock size={16} color='rgba(255, 255, 255, 0.8)' strokeWidth={2} />
            <Text style={styles.readTime}>{tip.readTime}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={styles.description}>{tip.description}</Text>
          <Text style={styles.contentText}>{tip.content}</Text>
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
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 50,
  },
});
