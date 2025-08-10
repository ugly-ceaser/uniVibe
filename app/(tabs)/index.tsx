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
import { BookOpen, Users, DollarSign, Shield, ChevronRight } from 'lucide-react-native';
import { survivalTips, SurvivalTip } from '@/data/survivalTips';

const categoryIcons = {
  'Academics': BookOpen,
  'Social Life': Users,
  'Budgeting': DollarSign,
  'Safety': Shield,
};

const categoryColors = {
  'Academics': ['#667eea', '#764ba2'],
  'Social Life': ['#f093fb', '#f5576c'],
  'Budgeting': ['#4facfe', '#00f2fe'],
  'Safety': ['#43e97b', '#38f9d7'],
};

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<SurvivalTip['category'] | 'All'>('All');

  const categories: (SurvivalTip['category'] | 'All')[] = ['All', 'Academics', 'Social Life', 'Budgeting', 'Safety'];

  const filteredTips = selectedCategory === 'All' 
    ? survivalTips 
    : survivalTips.filter(tip => tip.category === selectedCategory);

  const handleTipPress = (tip: SurvivalTip) => {
    router.push({
      pathname: '/tip-detail',
      params: { tipId: tip.id }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Survival Guide</Text>
        <Text style={styles.headerSubtitle}>Tips for your first year success</Text>
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

        {/* Tips List */}
        <View style={styles.tipsContainer}>
          {filteredTips.map((tip) => {
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
                  <IconComponent size={24} color="#ffffff" strokeWidth={2} />
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
                
                <ChevronRight size={20} color="#9ca3af" strokeWidth={2} />
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
  fab: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  actionModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#9ca3af',
  },
  chatModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    width: '100%',
    marginTop: 'auto',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  chatContent: {
    flex: 1,
    padding: 20,
  },
  aiMessageContainer: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aiMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  aiResponseContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aiResponse: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  forumModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    width: '100%',
    marginTop: 'auto',
  },
  forumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  forumHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forumHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    marginLeft: 12,
  },
  forumContent: {
    flex: 1,
    padding: 20,
  },
  forumInputGroup: {
    marginBottom: 20,
  },
  forumLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 8,
  },
  forumTitleInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#ffffff',
  },
  forumContentInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  postButton: {
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
});