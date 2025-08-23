import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { useGuides } from '@/hooks/useGuides';
import { ErrorMessage } from '@/components/ErrorMessage';
import { GuideCard } from '@/components/GuideCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';

export default function HomeScreen() {
  const router = useRouter();
  const { guides, loading, error, refreshing, refresh } = useGuides();

  const handleGuidePress = (guideId: string) => {
    router.push(`/guide/${guideId}`);
  };

  if (loading && !refreshing) {
    return <LoadingState title="Loading guides..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={refresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        contentContainerStyle={guides.length === 0 ? styles.emptyContentContainer : undefined}
      >
        {guides.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={64} color="#9ca3af" strokeWidth={1.5} />}
            title="No Guides Available"
            subtitle="No guides found. Pull down to refresh."
          />
        ) : (
          <View style={styles.guidesContainer}>
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                onPress={() => handleGuidePress(guide.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Extracted Header component
const Header = () => (
  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
    <Text style={styles.headerTitle}>Welcome to UniVibe</Text>
    <Text style={styles.headerSubtitle}>
      Discover guides to enhance your university experience
    </Text>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  guidesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
