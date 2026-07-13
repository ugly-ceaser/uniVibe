import { useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';

const COLLAPSE_THRESHOLD = 8; // px delta to trigger collapse
const ANIMATION_DURATION = 220; // ms

/**
 * Shared hook for the animated collapsible header effect used across tab screens.
 *
 * Usage:
 *   const { headerAnim, headerVisible, onScroll } = useScrollHeader();
 *
 *   // Wrap header JSX in:
 *   <Animated.View style={{ opacity: headerAnim, maxHeight: headerAnim.interpolate(...), overflow: 'hidden' }}>
 *     ...header content...
 *   </Animated.View>
 *
 *   // Add to ScrollView or FlatList:
 *   <ScrollView onScroll={onScroll} scrollEventThrottle={16} ...>
 */
export function useScrollHeader() {
  const headerAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  const onScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      if (delta > COLLAPSE_THRESHOLD && headerVisible) {
        // Scrolling DOWN — collapse
        setHeaderVisible(false);
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }).start();
      } else if ((delta < -COLLAPSE_THRESHOLD || y <= 10) && !headerVisible) {
        // Scrolling UP / back to top — expand
        setHeaderVisible(true);
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }).start();
      }
    },
    [headerAnim, headerVisible]
  );

  /** Interpolated maxHeight: pass your header's max natural height */
  const headerMaxHeight = (naturalHeight: number) =>
    headerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, naturalHeight],
    });

  return { headerAnim, headerVisible, onScroll, headerMaxHeight };
}
