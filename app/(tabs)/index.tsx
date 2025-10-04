import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, Bug, Info, AlertCircle } from 'lucide-react-native';
import { ErrorMessage } from '@/components/ErrorMessage';
import { GuideCard } from '@/components/GuideCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { guideApi, useApi } from '@/utils/api';
import { useState } from 'react';
import { Category, Guide } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const api = useApi();

  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🐛 Debug States
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [showDebugPanel, setShowDebugPanel] = useState(__DEV__); // Only show in development
  const [fetchAttempts, setFetchAttempts] = useState(0);

  const guideClient = React.useMemo(() => guideApi(api), [api]);

  const fetchGuides = useCallback(
    async (isRefresh = false) => {
      const attemptNumber = fetchAttempts + 1;
      setFetchAttempts(attemptNumber);
      
      // 🐛 Debug: Initial state check
      const debugStart = {
        timestamp: new Date().toISOString(),
        attempt: attemptNumber,
        isRefresh,
        hasAPI: !!api,
        hasGuideClient: !!guideClient,
        hasGetAllMethod: !!guideClient?.getAll,
        apiKeys: api ? Object.keys(api) : [],
        guideClientKeys: guideClient ? Object.keys(guideClient) : [],
      };
      
      console.log('🔍 [DEBUG] Fetch attempt started:', debugStart);
      setDebugInfo((prev: Record<string, any>) => ({ ...prev, lastAttempt: debugStart }));

      if (!guideClient?.getAll) {
        const errorMsg = 'API not available - guideClient or getAll method missing';
        const debugError = {
          ...debugStart,
          error: errorMsg,
          hasAPI: !!api,
          hasGuideClient: !!guideClient,
          apiType: typeof api,
          guideClientType: typeof guideClient,
        };
        
        console.error('🚨 [DEBUG] API Check Failed:', debugError);
        setDebugInfo((prev: Record<string, any>) => ({ ...prev, lastError: debugError }));
        setError(errorMsg);
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        console.log('🌐 [DEBUG] Starting API call...');
        const startTime = Date.now();
        
        const response: any = await guideClient.getAll();
        const endTime = Date.now();
        const duration = endTime - startTime;

        // � Debug: Detailed response analysis
        const debugResponse = {
          ...debugStart,
          duration: `${duration}ms`,
          responseType: typeof response,
          hasResponse: !!response,
          hasData: !!response?.data,
          dataType: typeof response?.data,
          isArray: Array.isArray(response?.data),
          dataLength: response?.data?.length || 0,
          responseKeys: response ? Object.keys(response) : [],
          dataKeys: response?.data && typeof response.data === 'object' ? Object.keys(response.data) : [],
          firstItem: response?.data?.[0] || null,
          rawResponse: JSON.stringify(response, null, 2).substring(0, 500) + '...',
        };

        console.log('📊 [DEBUG] API Response Analysis:', debugResponse);
        setDebugInfo((prev: Record<string, any>) => ({ ...prev, lastResponse: debugResponse }));

        if (response && response.data && Array.isArray(response.data)) {
          const transformedGuides = response.data.map((item: any, index: number) => {
            const transformed = {
              id: item.id,
              title: item.title,
              content: item.content,
              description:
                item.content?.substring(0, 120) + '...' ||
                'No description available',
              category: 'Academics' as Category,
              readTime: `${Math.ceil((item.content?.split(' ').length || 0) / 200)} min read`,
              likes: item.likesCount || 0,
              author: 'UniVibe Team',
              createdAt: item.createdAt,
              status: item.status,
            };
            
            // Debug first item transformation
            if (index === 0) {
              console.log('🔄 [DEBUG] First item transformation:', {
                original: item,
                transformed: transformed,
              });
            }
            
            return transformed;
          });
          
          console.log('✅ [DEBUG] Transformation successful:', {
            originalCount: response.data.length,
            transformedCount: transformedGuides.length,
            firstGuideTitle: transformedGuides[0]?.title,
          });
          
          setGuides(transformedGuides);
          setDebugInfo((prev: Record<string, any>) => ({ 
            ...prev, 
            lastSuccess: { 
              ...debugResponse, 
              transformedCount: transformedGuides.length,
              guides: transformedGuides.slice(0, 2) // Store first 2 for debugging
            } 
          }));
        } else {
          const warningMsg = 'No valid data in response';
          console.warn('⚠️ [DEBUG] Invalid response structure:', {
            response,
            hasResponse: !!response,
            hasData: !!response?.data,
            dataType: typeof response?.data,
            isArray: Array.isArray(response?.data),
          });
          
          setGuides([]);
          setDebugInfo((prev: Record<string, any>) => ({ 
            ...prev, 
            lastWarning: { ...debugResponse, warning: warningMsg } 
          }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load guides';
        
        // 🐛 Debug: Detailed error analysis
        const debugError = {
          ...debugStart,
          error: errorMessage,
          errorType: typeof err,
          errorName: err instanceof Error ? err.name : 'Unknown',
          errorStack: err instanceof Error ? err.stack?.substring(0, 500) : null,
          errorString: String(err),
        };
        
        console.error('💥 [DEBUG] Fetch error details:', debugError);
        setDebugInfo((prev: Record<string, any>) => ({ ...prev, lastError: debugError }));
        setError(errorMessage);
        setGuides(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
        
        console.log('🏁 [DEBUG] Fetch attempt completed:', {
          attempt: attemptNumber,
          finalState: {
            loading: false,
            refreshing: false,
            hasGuides: !!guides,
            guidesCount: guides?.length || 0,
            hasError: !!error,
          }
        });
      }
    },
    [guideClient, api] // 🔧 FIXED: Removed fetchAttempts from dependencies to prevent infinite loops
  );

  useEffect(() => {
    console.log('HomeScreen mounted, fetching guides...');
    fetchGuides();
  }, [fetchGuides]);

  // Add this to see state changes
  useEffect(() => {
    console.log('Guides state updated:', {
      guides,
      loading,
      refreshing,
      error,
    });
  }, [guides, loading, refreshing, error]);

  const onRefresh = useCallback(() => {
    fetchGuides(true);
  }, [fetchGuides]);

  const handleGuidePress = (guideId: string) => {
    router.push(`/guide/${guideId}`);
  };

  // 🐛 Debug Helper Functions
  const showDebugAlert = () => {
    const apiDebugInfo = api.getDebugInfo();
    const fullDebugInfo = {
      component: debugInfo,
      api: apiDebugInfo,
      fetchAttempts,
      currentState: {
        guides: guides?.length || 0,
        loading,
        refreshing,
        error,
      }
    };
    
    const debugString = JSON.stringify(fullDebugInfo, null, 2);
    Alert.alert(
      '🐛 Debug Information',
      debugString.length > 1000 
        ? debugString.substring(0, 1000) + '...\n\n(Truncated - check console for full info)'
        : debugString,
      [
        { text: 'Copy to Console', onPress: () => console.log('Full Debug Info:', fullDebugInfo) },
        { text: 'Clear Pending', onPress: () => { api.clearPendingRequests(); fetchGuides(); } },
        { text: 'Retry Fetch', onPress: () => fetchGuides() },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const getDebugStatus = () => {
    if (debugInfo.lastSuccess) return { color: '#10b981', text: 'Success', icon: '✅' };
    if (debugInfo.lastError) return { color: '#ef4444', text: 'Error', icon: '❌' };
    if (debugInfo.lastWarning) return { color: '#f59e0b', text: 'Warning', icon: '⚠️' };
    if (debugInfo.lastAttempt) return { color: '#3b82f6', text: 'Loading', icon: '🔄' };
    return { color: '#6b7280', text: 'Ready', icon: '⭕' };
  };

  if (loading && !refreshing) {
    return <LoadingState title='Loading guides!!!...' />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} onRetry={onRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      {/* 🐛 Debug Panel */}
      {showDebugPanel && (
        <View style={styles.debugPanel}>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={showDebugAlert}
          >
            <Bug size={16} color="#ffffff" />
            <Text style={styles.debugButtonText}>
              Debug ({fetchAttempts}) {getDebugStatus().icon}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.debugToggle}
            onPress={() => setShowDebugPanel(false)}
          >
            <Text style={styles.debugToggleText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Debug Status Indicator */}
      {!showDebugPanel && __DEV__ && (
        <TouchableOpacity 
          style={[styles.debugIndicator, { backgroundColor: getDebugStatus().color }]}
          onPress={() => setShowDebugPanel(true)}
        >
          <Bug size={14} color="#ffffff" />
        </TouchableOpacity>
      )}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
          guides && guides.length === 0
            ? styles.emptyContentContainer
            : undefined
        }
      >
        {/* Debug Info Card - shows key debug info inline */}
        {showDebugPanel && (
          <View style={styles.debugCard}>
            <Text style={styles.debugCardTitle}>🔍 Debug Status</Text>
            <Text style={styles.debugCardText}>
              Status: {getDebugStatus().text} | Attempts: {fetchAttempts}
            </Text>
            <Text style={styles.debugCardText}>
              API: {api ? '✅' : '❌'} | Client: {guideClient ? '✅' : '❌'} | Method: {typeof guideClient?.getAll === 'function' ? '✅' : '❌'}
            </Text>
            <Text style={styles.debugCardText}>
              Guides: {guides ? `${guides.length} loaded` : 'null'} | Loading: {loading ? 'Yes' : 'No'} | Error: {error ? 'Yes' : 'No'}
            </Text>
            {debugInfo.lastError && (
              <Text style={[styles.debugCardText, { color: '#ef4444' }]}>
                Last Error: {debugInfo.lastError.error}
              </Text>
            )}
          </View>
        )}
        
        {guides && guides.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={64} color='#9ca3af' strokeWidth={1.5} />}
            title='No Guides Available'
            subtitle='No guides found. Pull down to refresh or check debug info above.'
          />
        ) : (
          <View style={styles.guidesContainer}>
            {guides &&
              guides.map(guide => (
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
  // 🐛 Debug Styles
  debugPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugToggle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
  },
  debugToggleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugIndicator: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  debugCard: {
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  debugCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugCardText: {
    color: '#d1d5db',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
