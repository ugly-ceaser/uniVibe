import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightTheme } from '@/constants/theme';

interface HeroBannerProps {
  badgeText: string;
  title: string | React.ReactNode;
  subtitle: string;
  emoji?: string;
  rightAction?: React.ReactNode;
  gradientColors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  badgeText,
  title,
  subtitle,
  emoji,
  rightAction,
  gradientColors = ['#6B21A8', '#9333EA', '#C026D3', '#DB2777'],
  style,
}) => {
  return (
    <View style={[styles.heroBannerWrapper, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.decorCircle} />

        {/* Top row with badge and optional right action */}
        <View style={styles.heroBannerTop}>
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonBadgeText}>{badgeText}</Text>
          </View>
          {rightAction ? <View>{rightAction}</View> : null}
        </View>

        {/* Bottom content block */}
        <View style={styles.heroBannerContent}>
          {typeof title === 'string' ? (
            <Text style={styles.heroHeading} numberOfLines={2}>
              {title}
            </Text>
          ) : (
            title
          )}

          {emoji ? <Text style={styles.heroEmoji}>{emoji}</Text> : null}

          <Text style={styles.heroSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  heroBannerWrapper: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    marginBottom: lightTheme.spacing.md,
    overflow: 'hidden',
  },
  heroBanner: {
    minHeight: 205,
    borderRadius: 21.5,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    justifyContent: 'space-between',
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
  heroBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 38,
  },
  seasonBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000',
    alignSelf: 'flex-start',
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  heroBannerContent: {
    justifyContent: 'flex-end',
  },
  heroHeading: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 33,
    marginBottom: 6,
  },
  heroEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
    fontWeight: '500',
  },
});
