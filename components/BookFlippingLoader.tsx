import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { BookOpen } from 'lucide-react-native';

interface BookFlippingLoaderProps {
  message?: string;
  courseCode?: string;
}

export function BookFlippingLoader({
  message = 'Opening course notes & chat history…',
  courseCode,
}: BookFlippingLoaderProps): React.JSX.Element {
  const flipAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    // Continuous page flip rotation animation loop
    flipAnim.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      }),
      -1,
      true
    );

    // Subtle scale pulsing loop
    pulseAnim.value = withRepeat(
      withTiming(1.08, {
        duration: 900,
        easing: Easing.ease,
      }),
      -1,
      true
    );
  }, [flipAnim, pulseAnim]);

  const animatedPageStyle = useAnimatedStyle(() => {
    const rotateY = `${interpolate(flipAnim.value, [0, 1], [-25, 25])}deg`;
    return {
      transform: [
        { perspective: 400 },
        { scale: pulseAnim.value },
        { rotateY },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(flipAnim.value, [0, 0.5, 1], [0.3, 0.8, 0.3]);
    return {
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.glowRing, glowStyle]} />
        <Animated.View style={[styles.bookBox, animatedPageStyle]}>
          <BookOpen size={36} color="#C4FF0E" strokeWidth={2.4} />
        </Animated.View>
      </View>

      {courseCode ? (
        <View style={styles.courseBadge}>
          <Text style={styles.courseBadgeText}>{courseCode}</Text>
        </View>
      ) : null}

      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  glowRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(196, 255, 14, 0.15)',
  },
  bookBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#0F0F16',
    borderWidth: 2,
    borderColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C4FF0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  courseBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 19,
  },
});
