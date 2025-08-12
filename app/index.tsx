import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

    // Animate text after logo
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Navigate to onboarding after animation
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2500);

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
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>FC</Text>
          </View>
        </Animated.View>

        <Animated.View style={textAnimatedStyle}>
          <Text style={styles.title}>Fresher Companion</Text>
          <Text style={styles.subtitle}>Your Campus Survival Guide</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});
