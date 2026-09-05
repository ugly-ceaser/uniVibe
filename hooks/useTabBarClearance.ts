import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Tab bar dimensions — must stay in sync with app/(tabs)/_layout.tsx:
 *   height: Platform.OS === 'ios' ? 88 : 74
 *
 * The safe-area bottom inset is already included in those heights on iOS
 * (the tab bar sits above the home indicator), so we only ADD the inset
 * on Android where the bar height does not account for it.
 */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 74;

/**
 * Returns the total bottom clearance (in px) that scroll containers need
 * so their last item is never hidden behind the floating tab bar.
 *
 * @param extraPadding  Additional px for screens that have a floating action
 *                      button above the nav bar (e.g. Forum's FAB = 56 px).
 */
export function useTabBarClearance(extraPadding = 0): number {
  const insets = useSafeAreaInsets();

  // On Android the tab bar height does not absorb the system gesture bar, so
  // we add the bottom inset. On iOS the tab bar already covers that area.
  const bottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  return TAB_BAR_HEIGHT + bottomInset + extraPadding;
}

/** Exposed for consumers that want the raw height without a hook (e.g. StyleSheet). */
export { TAB_BAR_HEIGHT };
