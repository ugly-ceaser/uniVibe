import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { GraduationCap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo entrance
    logoScale.value = withSequence(
      withTiming(1.2, { duration: 600 }),
      withTiming(1, { duration: 200 })
    );
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Animate text and footer after logo
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Navigate to onboarding after animation
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2800);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, textOpacity, router]);

  const logoAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: logoScale.value }],
      opacity: logoOpacity.value,
    }),
    [logoScale, logoOpacity]
  );

  const textAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: textOpacity.value,
    }),
    [textOpacity]
  );

  return (
    <View style={styles.container}>
      {/* ─── Decorative Blur Circles ─── */}
      <View style={styles.decorTopLeft} />
      <View style={styles.decorBottomRight} />

      {/* ─── Floating Star Sparkles ─── */}
      <Text style={[styles.sparkle, styles.sparkle1]}>✦</Text>
      <Text style={[styles.sparkle, styles.sparkle2]}>✦</Text>
      <Text style={[styles.sparkle, styles.sparkle3]}>✦</Text>

      {/* ─── Content ─── */}
      <View style={styles.content}>
        {/* Center Logo Card */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoCard}>
            <GraduationCap size={68} color='#0F0F16' strokeWidth={2} />
          </View>
        </Animated.View>

        {/* Title and Subtitle */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <View style={styles.titleRow}>
            <Text style={styles.titleUni}>Uni</Text>
            <Text style={styles.titleVibe}>Vibe</Text>
          </View>
          <Text style={styles.subtitle}>campus life, decoded</Text>
        </Animated.View>
      </View>

      {/* ─── Bottom Pagination Dots & Loading Status ─── */}
      <Animated.View style={[styles.bottomContainer, textAnimatedStyle]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.loadingText}>Setting the vibe...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3F1675', // Deep purple base
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#5820A3',
    opacity: 0.65,
  },
  decorBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#832877',
    opacity: 0.4,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 22,
    fontWeight: '900',
    color: '#FF6B9D',
  },
  sparkle1: {
    top: '20%',
    right: '25%',
    color: '#FFD93D',
  },
  sparkle2: {
    top: '28%',
    left: '20%',
    color: '#C4FF0E',
  },
  sparkle3: {
    bottom: '28%',
    right: '20%',
    color: '#C4FF0E',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    marginBottom: 28,
  },
  logoCard: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#000000',
    // Solid offset shadow
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleUni: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
  },
  titleVibe: {
    fontSize: 44,
    fontWeight: '900',
    color: '#C4FF0E',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  bottomContainer: {
    alignItems: 'center',
    marginBottom: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    backgroundColor: '#C4FF0E',
    width: 8,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
