/**
 * LoadingState.tsx
 *
 * Branded full-screen loader that matches the current Univibe neo-brutalist
 * design system.  Replaces the old "Welcome to UniVibe" legacy header.
 *
 * Usage variants:
 *   <LoadingState />                          — pulsing logo + spinner
 *   <LoadingState title="Loading courses…" /> — with a custom subtitle
 *   <LoadingState skeleton={3} />             — N skeleton card rows
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  SafeAreaView,
  Easing,
} from 'react-native';

// ─── Palette (mirrors the rest of the app) ──────────────────────────────────
const BRAND_BG = '#EDE9F8';
const BRAND_PURPLE = '#7B2FBE';
const BRAND_LIME = '#C4FF0E';
const INK = '#0D0D0D';
const MUTED = '#6B7280';
const CARD_BG = '#FFFFFF';
const BORDER = '#000000';

// ─── Skeleton block ─────────────────────────────────────────────────────────
export function SkeletonBlock({
  width = '100%',
  height = 18,
  radius = 8,
  style,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: BRAND_PURPLE,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Skeleton card row (card icon + two text lines) ─────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonBlock width={54} height={54} radius={14} />
      <View style={styles.skeletonTextCol}>
        <SkeletonBlock width="70%" height={14} radius={6} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="90%" height={12} radius={6} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="55%" height={12} radius={6} />
      </View>
    </View>
  );
}

// ─── Dot spinner ─────────────────────────────────────────────────────────────
function DotSpinner() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -8,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = makeDot(dot1, 0);
    const a2 = makeDot(dot2, 200);
    const a3 = makeDot(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_PURPLE,
    marginHorizontal: 4,
    transform: [{ translateY: anim }],
  });

  return (
    <View style={styles.dotRow}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface LoadingStateProps {
  /** Optional label shown below the spinner */
  title?: string;
  /** If provided, renders N skeleton card rows instead of the dot spinner */
  skeleton?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title,
  skeleton,
}) => {
  const showSkeleton = typeof skeleton === 'number' && skeleton > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Brand badge header ─── */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>UV</Text>
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.appName}>UniVibe</Text>
          <Text style={styles.tagline}>your campus, your vibe ✦</Text>
        </View>
      </View>

      {/* ─── Content area ─── */}
      <View style={styles.body}>
        {showSkeleton ? (
          // Skeleton card rows
          <>
            {Array.from({ length: skeleton! }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : (
          // Dot spinner + optional label
          <>
            <DotSpinner />
            {title ? (
              <Text style={styles.label}>{title}</Text>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: BORDER,
    backgroundColor: BRAND_BG,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_LIME,
    borderWidth: 2,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BORDER,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
  },
  headerTextCol: {
    gap: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },

  // Body
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  label: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '700',
    color: MUTED,
    textAlign: 'center',
  },

  // Dot spinner
  dotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
  },

  // Skeleton
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: BORDER,
    shadowColor: BORDER,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    marginBottom: 14,
    width: '100%',
  },
  skeletonTextCol: {
    flex: 1,
  },
});
