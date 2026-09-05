import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRoute, useNavigationState } from '@react-navigation/native';
import { useTabHistory } from '@/contexts/TabHistoryContext';

const { width } = Dimensions.get('window');

interface TabTransitionWrapperProps {
  children: React.ReactNode;
}

export function TabTransitionWrapper({ children }: TabTransitionWrapperProps) {
  const route = useRoute();
  const { lastTabIndexRef } = useTabHistory();

  // Retrieve the closest navigator state (which is the bottom tab navigator)
  const tabState = useNavigationState(state => state);
  
  // Extract active tab index and current screen index in the tab navigator
  const activeIndex = tabState?.index ?? 0;
  const myIndex = tabState?.routeNames?.indexOf(route.name) ?? 0;
  
  const isFocused = activeIndex === myIndex;

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

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
        // Navigating to a tab on the right -> slide in from the right
        translateX.value = width;
      } else if (activeIndex < lastIndex) {
        // Navigating to a tab on the left -> slide in from the left
        translateX.value = -width;
      } else {
        // Initial load or same tab -> start at center
        translateX.value = 0;
      }

      // Update the shared ref with the new index
      lastTabIndexRef.current = activeIndex;

      // Perform slide and fade in
      translateX.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
    } else {
      // Screen is blurred: immediately hide it to prevent overlap
      opacity.value = 0;
    }
  }, [isFocused, activeIndex, myIndex, lastTabIndexRef]);

  return (
    <Animated.View
      style={[styles.container, animStyle]}
      pointerEvents={isFocused ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
