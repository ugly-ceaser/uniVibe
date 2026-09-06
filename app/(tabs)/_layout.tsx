import { Tabs } from 'expo-router';
import { Home, Map, MessageCircle, BookOpen, User } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TabHistoryProvider } from '@/contexts/TabHistoryContext';

const ACTIVE_COLOR = '#C4FF0E';
const INACTIVE_COLOR = '#555577';
const TAB_BG = '#0F0F16';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <ErrorBoundary>
      <TabHistoryProvider>
        <View style={styles.container}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarHideOnKeyboard: true,
              tabBarActiveTintColor: ACTIVE_COLOR,
              tabBarInactiveTintColor: INACTIVE_COLOR,
              tabBarStyle: {
                backgroundColor: TAB_BG,
                borderTopWidth: 0,
                paddingBottom: bottomInset,
                paddingTop: 8,
                height: 60 + bottomInset,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                marginTop: 2,
              },
            }}
          >
          <Tabs.Screen
            name='index'
            options={{
              title: 'Home',
              tabBarIcon: ({ size, color }) => (
                <Home size={size - 2} color={color} strokeWidth={2.2} />
              ),
            }}
          />
          <Tabs.Screen
            name='map'
            options={{
              title: 'Map',
              tabBarIcon: ({ size, color }) => (
                <Map size={size - 2} color={color} strokeWidth={2.2} />
              ),
            }}
          />
          <Tabs.Screen
            name='forum'
            options={{
              title: 'Forum',
              tabBarIcon: ({ size, color }) => (
                <MessageCircle
                  size={size - 2}
                  color={color}
                  strokeWidth={2.2}
                />
              ),
            }}
          />
          <Tabs.Screen
            name='courses'
            options={{
              title: 'Courses',
              tabBarIcon: ({ size, color }) => (
                <BookOpen size={size - 2} color={color} strokeWidth={2.2} />
              ),
            }}
          />
          <Tabs.Screen
            name='profile'
            options={{
              title: 'Profile',
              tabBarIcon: ({ size, color }) => (
                <User size={size - 2} color={color} strokeWidth={2.2} />
              ),
            }}
          />
          </Tabs>
        </View>
      </TabHistoryProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEFFF',
  },
});
