import { Tabs, usePathname } from 'expo-router';
import {
  Chrome as Home,
  Map,
  MessageSquare,
  BookOpen,
  User,
} from 'lucide-react-native';
import GlobalChatButton from '@/components/GlobalChatButton';
import { View, StyleSheet } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TabLayout() {
  const pathname = usePathname();
  // Hide FAB on /forum and /(tabs)/forum (and any nested paths)
  const isForum =
    pathname === '/forum' ||
    pathname?.startsWith('/forum') ||
    pathname?.startsWith('/(tabs)/forum');
  const showFab = !isForum;

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#667eea',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
              paddingBottom: 8,
              paddingTop: 8,
              height: 70,
            },
            tabBarLabelStyle: {
              fontFamily: 'Inter-Medium',
              fontSize: 12,
            },
          }}
        >
          <Tabs.Screen
            name='index'
            options={{
              title: 'Home',
              tabBarIcon: ({ size, color }) => (
                <Home size={size} color={color} strokeWidth={2} />
              ),
            }}
          />
          <Tabs.Screen
            name='map'
            options={{
              title: 'Map',
              tabBarIcon: ({ size, color }) => (
                <Map size={size} color={color} strokeWidth={2} />
              ),
            }}
          />
          <Tabs.Screen
            name='forum'
            options={{
              title: 'Forum',
              tabBarIcon: ({ size, color }) => (
                <MessageSquare size={size} color={color} strokeWidth={2} />
              ),
            }}
          />
          <Tabs.Screen
            name='courses'
            options={{
              title: 'Courses',
              tabBarIcon: ({ size, color }) => (
                <BookOpen size={size} color={color} strokeWidth={2} />
              ),
            }}
          />
          <Tabs.Screen
            name='profile'
            options={{
              title: 'Profile',
              tabBarIcon: ({ size, color }) => (
                <User size={size} color={color} strokeWidth={2} />
              ),
            }}
          />
        </Tabs>
        {showFab ? <GlobalChatButton /> : null}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
