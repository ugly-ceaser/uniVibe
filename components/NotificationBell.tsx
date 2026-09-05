import React, { useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { notificationsApi } from '@/utils/api';

interface NotificationBellProps {
  size?: number;
  color?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  size = 22,
  color = '#FFFFFF',
  badgeBgColor = '#FF3B30',
  badgeTextColor = '#FFFFFF',
}) => {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi().getUnreadCount();
      if (response.data?.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch {
      // Ignore unauthenticated or offline errors gracefully
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  return (
    <TouchableOpacity
      style={styles.bellButton}
      onPress={() => router.push('/notifications' as any)}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
      accessibilityRole="button"
    >
      <Bell size={size} color={color} strokeWidth={2.2} />
      {unreadCount > 0 ? (
        <View style={[styles.badgeContainer, { backgroundColor: badgeBgColor }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
});
