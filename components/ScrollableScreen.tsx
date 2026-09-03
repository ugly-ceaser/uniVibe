/**
 * ScrollableScreen — shared FlatList-based shell for list screens.
 *
 * Architecture:
 *  ┌───────────────────────────────────────┐
 *  │  FlatList                             │
 *  │  ├─ ListHeaderComponent               │
 *  │  │   ├─ [0] hero + section label      │  (scrolls away)
 *  │  │   └─ [1] horizontal chip row       │  ← stickyHeaderIndices={[1]}
 *  │  ├─ renderItem  (card rows)           │
 *  │  ├─ ListEmptyComponent                │
 *  │  └─ ListFooterComponent               │
 *  └───────────────────────────────────────┘
 *
 * The chip row at header index 1 is pinned to the top once the hero
 * scrolls past it — giving the "Twitter/Instagram sticky filter" feel.
 * Horizontal-in-vertical nesting is intentional and safe (no warning).
 */

import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ListRenderItem,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { lightTheme } from '@/constants/theme';

interface ScrollableScreenProps<T> {
  /** The hero banner card (rendered above chips, scrolls away). */
  hero: React.ReactNode;

  /**
   * The horizontal filter chip row. Should already be a horizontal
   * ScrollView/FlatList — it will be wrapped in a sticky container.
   */
  filterChips: React.ReactNode;

  /** Optional section label row rendered between hero and chips. */
  sectionHeader?: React.ReactNode;

  /** List data items. */
  data: T[];

  /** FlatList renderItem — same signature as FlatList's own prop. */
  renderItem: ListRenderItem<T>;

  /** Must return a stable unique string per item. */
  keyExtractor: (item: T, index: number) => string;

  /** Rendered when data is empty and not loading. */
  ListEmptyComponent?: React.ReactElement | null;

  /** Rendered below the last item (e.g. a loading-more spinner). */
  ListFooterComponent?: React.ReactElement | (() => React.ReactElement | null) | null;

  /** Called when the user scrolls within `onEndReachedThreshold` of the bottom. */
  onEndReached?: () => void;
  onEndReachedThreshold?: number;

  /** Pull-to-refresh control. */
  refreshControl?: React.ReactElement<any>;

  /**
   * Extra bottom padding for screens with a floating action button above
   * the nav bar. E.g. pass 64 if your FAB is 48 px tall + 16 px gap.
   */
  extraBottomPadding?: number;

  /** Forward scroll events to parent (e.g. for collapsing a custom header). */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;

  /** Background color of the sticky chip row (default: '#EBEFFF'). */
  chipRowBackground?: string;

  /** Outer container background (default: '#EBEFFF'). */
  backgroundColor?: string;

  /** Pass `false` to disable chip sticking (default: true). */
  stickyChips?: boolean;
}

function ScrollableScreenInner<T>(
  props: ScrollableScreenProps<T>,
  _ref: React.Ref<FlatList<T>>
) {
  const {
    hero,
    filterChips,
    sectionHeader,
    data,
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    ListFooterComponent,
    onEndReached,
    onEndReachedThreshold = 0.3,
    refreshControl,
    extraBottomPadding = 0,
    onScroll,
    scrollEventThrottle = 16,
    chipRowBackground = '#EBEFFF',
    backgroundColor = '#EBEFFF',
    stickyChips = true,
  } = props;

  const clearance = useTabBarClearance(extraBottomPadding);

  /**
   * Two-element header array so stickyHeaderIndices can target index 1.
   * Index 0 = hero (+ optional section label) — scrolls away.
   * Index 1 = chip row — sticks once hero is off-screen.
   */
  const ListHeaderComponent = (
    <>
      {/* ── [0] Hero + optional section label ── */}
      <View style={styles.heroBlock}>
        {hero}
        {sectionHeader ?? null}
      </View>

      {/* ── [1] Sticky chip row ── */}
      <View style={[styles.chipRow, { backgroundColor: chipRowBackground }]}>
        {filterChips}
      </View>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={['top']}
    >
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        // Pin the chip row (header child index 1) to the top
        stickyHeaderIndices={stickyChips ? [1] : []}
        ListEmptyComponent={ListEmptyComponent ?? null}
        ListFooterComponent={ListFooterComponent ?? null}
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: clearance },
        ]}
        // Keep native scroll physics — don't set decelerationRate
      />
    </SafeAreaView>
  );
}

/**
 * Generic forwardRef wrapper so callers can imperatively scroll if needed.
 */
const ScrollableScreen = React.forwardRef(ScrollableScreenInner) as <T>(
  props: ScrollableScreenProps<T> & { ref?: React.Ref<FlatList<T>> }
) => React.ReactElement;

export { ScrollableScreen };
export type { ScrollableScreenProps };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: lightTheme.spacing.md,
    paddingTop: 12,
  },
  heroBlock: {
    // No extra padding — hero already has its own margins
  },
  chipRow: {
    paddingVertical: lightTheme.spacing.sm,
    marginHorizontal: -lightTheme.spacing.md,
  },
});
