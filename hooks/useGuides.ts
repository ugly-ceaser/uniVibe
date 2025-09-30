import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useApi, guideApi } from '@/utils/api';
import { Guide, Category } from '@/types/guide';

interface UseGuidesReturn {
  guides: Guide[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  fetchGuides: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useGuides = (): UseGuidesReturn => {
  const api = useApi();
  const apiClient = React.useMemo(() => guideApi(api), [api]);

  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchGuides = useCallback(
    async (isRefresh = false) => {
      if (!apiClient?.getAll) {
        setError('API not available');
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

        console.log('Before Response');

        const response = await apiClient.getAll();
        console.log('Response', response);

        console.log('After response!');

        if (response?.data && Array.isArray(response.data)) {
          const transformedGuides = response.data.map((item: any) => ({
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
          }));

          setGuides(transformedGuides);
        } else {
          setGuides([]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load guides';
        setError(errorMessage);
        setGuides([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setInitialized(true);
      }
    },
    [apiClient]
  );

  const refresh = useCallback(() => fetchGuides(true), [fetchGuides]);

  // Initialize on mount
  useEffect(() => {
    if (!initialized && apiClient) {
      fetchGuides();
    }
  }, [fetchGuides, initialized, apiClient]);

  return {
    guides,
    loading,
    error,
    refreshing,
    fetchGuides,
    refresh,
  };
};
