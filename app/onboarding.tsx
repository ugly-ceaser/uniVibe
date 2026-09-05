import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { markOnboardingComplete } from '@/utils/onboarding';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    emoji: '📚',
    iconBg: '#C8F135',
    title: 'Academic\nexcellence',
    description:
      'Survival tips, course guides, and study strategies to actually pass your first year.',
    colors: ['#4B1FA8', '#7B2FBE', '#B056F5'] as const,
  },
  {
    id: 2,
    emoji: '📍',
    iconBg: '#ffffff',
    title: 'Navigate\ncampus',
    description:
      'Find your way around with shortcuts, maps, and the fastest routes between classes.',
    colors: ['#5B1E9C', '#8B3FC8', '#B050E8'] as const,
  },
  {
    id: 3,
    emoji: '👥',
    iconBg: '#4DD9D9',
    title: 'Connect &\nlearn',
    description:
      'Join discussions, ask questions, and link up with fellow students in the forum.',
    colors: ['#F43F5E', '#C2376B', '#8B2080'] as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const finishOnboarding = async () => {
    try {
      await markOnboardingComplete();
    } finally {
      router.replace('/login');
    }
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      void finishOnboarding();
    }
  };

  const handleSkip = () => {
    void finishOnboarding();
  };

  const isLast = currentIndex === onboardingData.length - 1;
  const current = onboardingData[currentIndex];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      >
        {onboardingData.map((item, index) => (
          <LinearGradient
            key={item.id}
            colors={item.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.slide}
          >
            {/* Decorative orbs */}
            <View style={styles.orb1} />
            <View style={styles.orb2} />

            {/* Icon */}
            <View
              style={[styles.iconContainer, { backgroundColor: item.iconBg }]}
            >
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{item.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{item.description}</Text>

            {/* Pagination dots */}
            <View style={styles.pagination}>
              {onboardingData.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={[styles.dot, dotIndex === index && styles.activeDot]}
                />
              ))}
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.footer}>
        {!isLast ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextButton, isLast && styles.getStartedButton]}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextText, isLast && styles.getStartedText]}>
            {isLast ? 'Get started 🚀' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4B1FA8',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  orb1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    top: 60,
    left: -60,
  },
  orb2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    bottom: 100,
    right: -40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconEmoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 20,
    fontFamily: 'Inter-Bold',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
    marginBottom: 48,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  activeDot: {
    backgroundColor: '#C8F135',
    width: 24,
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  nextButton: {
    backgroundColor: '#C8F135',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedButton: {
    backgroundColor: '#ffffff',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    fontFamily: 'Inter-Bold',
  },
  getStartedText: {
    color: '#1a1a2e',
  },
});
