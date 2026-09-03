import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Users,
  DollarSign,
  Shield,
  GraduationCap,
} from 'lucide-react-native';
import { Guide, Category } from '@/types/guide';
import { lightTheme } from '@/constants/theme';

interface GuideCardProps {
  guide: Guide;
  onPress: () => void;
  isHot?: boolean;
}

const CATEGORY_CONFIG: Record<
  Category,
  { iconBg: string; icon: React.ReactNode; badgeLabel: string }
> = {
  Academics: {
    iconBg: '#C4FF0E',
    icon: <GraduationCap size={26} color='#000' />,
    badgeLabel: 'ACADEMICS',
  },
  'Social Life': {
    iconBg: '#FF6B9D',
    icon: <Users size={26} color='#fff' />,
    badgeLabel: 'SOCIAL',
  },
  Budgeting: {
    iconBg: '#FFD93D',
    icon: <DollarSign size={26} color='#000' />,
    badgeLabel: 'FINANCIAL',
  },
  Safety: {
    iconBg: '#6BCB77',
    icon: <Shield size={26} color='#fff' />,
    badgeLabel: 'SAFETY',
  },
};

export const GuideCard: React.FC<GuideCardProps> = ({
  guide,
  onPress,
  isHot = false,
}) => {
  const config = CATEGORY_CONFIG[guide.category] || CATEGORY_CONFIG.Academics;

  return (
    <View style={styles.cardShadowWrapper}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Hot badge */}
        {isHot && (
          <View style={styles.hotBadge}>
            <Text style={styles.hotBadgeText}>🔥 hot</Text>
          </View>
        )}

        {/* Left icon box */}
        <View style={[styles.iconBox, { backgroundColor: config.iconBg }]}>
          {config.icon}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{config.badgeLabel}</Text>
            </View>
            <Text style={styles.readTime}>{guide.readTime}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {guide.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {guide.description}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadowWrapper: {
    marginBottom: lightTheme.spacing.md,
    // Offset shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  hotBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  hotBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#000',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  readTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D0D0D',
    marginBottom: 3,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});
