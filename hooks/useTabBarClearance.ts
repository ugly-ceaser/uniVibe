import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Base tab bar content height excluding bottom system navigation insets.
 */
const BASE_TAB_BAR_HEIGHT = 60;

/**
 * Returns the total bottom clearance (in px) that scroll containers need
 * so their last item is never hidden behind the navigation bar.
 *
 * @param extraPadding  Additional px for screens that have a floating action
 *                      button above the nav bar.
 */
export function useTabBarClearance(extraPadding = 0): number {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return BASE_TAB_BAR_HEIGHT + bottomInset + extraPadding;
}

/** Exposed for consumers that want the base height. */
export { BASE_TAB_BAR_HEIGHT };

