import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, BookOpen, Users, DollarSign, Shield } from 'lucide-react-native';
import { Guide, Category } from '@/types/guide';

interface GuideCardProps {
  guide: Guide;
  onPress: () => void;
}

// Map categories → gradient + icon
const CATEGORY_STYLES: Record<
  Category,
  { colors: string[]; icon: React.ReactNode }
> = {
  Academics: {
    colors: ['#667eea', '#764ba2'],
    icon: <BookOpen size={24} color="#fff" />,
  },
  Social: {
    colors: ['#f093fb', '#f5576c'],
    icon: <Users size={24} color="#fff" />,
  },
  Financial: {
    colors: ['#4facfe', '#00f2fe'],
    icon: <DollarSign size={24} color="#fff" />,
  },
  Safety: {
    colors: ['#43e97b', '#38f9d7'],
    icon: <Shield size={24} color="#fff" />,
  },
};

export const GuideCard: React.FC<GuideCardProps> = ({ guide, onPress }) => {
  const { colors, icon } = CATEGORY_STYLES[guide.category] || CATEGORY_STYLES.Academics;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Icon Gradient */}
      <LinearGradient
        colors={colors}
        style={styles.iconWrapper}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon}
      </LinearGradient>

      {/* Text Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>{guide.category}</Text>
          <Text style={styles.readTime}>{guide.readTime}</Text>
        </View>
        <Text style={styles.title}>{guide.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {guide.description}
        </Text>
      </View>

      {/* Arrow */}
      <ChevronRight size={20} color="#9ca3af" style={styles.arrow} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  readTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  arrow: {
    marginLeft: 8,
  },
});
