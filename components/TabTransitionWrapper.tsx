import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRoute, useNavigationState } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTabHistory } from '@/contexts/TabHistoryContext';

const { width } = Dimensions.get('window');

const TAB_ROUTES = ['/(tabs)', '/(tabs)/map', '/(tabs)/forum', '/(tabs)/courses', '/(tabs)/profile'];

interface TabTransitionWrapperProps {
  children: React.ReactNode;
}

export function TabTransitionWrapper({ children }: TabTransitionWrapperProps) {
  const route = useRoute();
  const router = useRouter();
  const { lastTabIndexRef } = useTabHistory();

  // Retrieve the closest navigator state (bottom tab navigator)
  const tabState = useNavigationState(state => state);
  
  // Extract active tab index and current screen index in the tab navigator
  const activeIndex = tabState?.index ?? 0;
  const myIndex = tabState?.routeNames?.indexOf(route.name) ?? 0;
  
  const isFocused = activeIndex === myIndex;
  const isMapTab = route.name === 'map';

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  const navigateToTab = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < TAB_ROUTES.length) {
      router.push(TAB_ROUTES[targetIndex] as any);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-35, 35])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      'worklet';
      if (isMapTab) return; // Disable tab swipe on Map screen to preserve map panning

      if (event.translationX < -60 || event.velocityX < -600) {
        // Swiped left -> navigate to next tab on the right
        if (myIndex < TAB_ROUTES.length - 1) {
          runOnJS(navigateToTab)(myIndex + 1);
        }
      } else if (event.translationX > 60 || event.velocityX > 600) {
        // Swiped right -> navigate to previous tab on the left
        if (myIndex > 0) {
          runOnJS(navigateToTab)(myIndex - 1);
        }
      }
    });

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    if (isFocused) {
      const lastIndex = lastTabIndexRef.current;

      // Determine slide direction based on index difference
      if (activeIndex > lastIndex) {
        translateX.value = width;
      } else if (activeIndex < lastIndex) {
        translateX.value = -width;
      } else {
        translateX.value = 0;
      }

      lastTabIndexRef.current = activeIndex;

      translateX.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
    } else {
      opacity.value = 0;
    }
  }, [isFocused, activeIndex, myIndex, lastTabIndexRef]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.container, animStyle]}
        pointerEvents={isFocused ? 'auto' : 'none'}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

