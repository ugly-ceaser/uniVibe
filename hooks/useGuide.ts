import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { useApi, guideApi } from '@/utils/api';
import { Guide } from '@/types/guide';

interface UseGuideReturn {
  guide: Guide | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useGuide = (id: string | undefined): UseGuideReturn => {
  const api = useApi();
  const apiClient = React.useMemo(() => guideApi(api), [api]);

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Use ref to prevent infinite loops
  const lastFetchedId = useRef<string | null>(null);
  const isInitialized = useRef(false);

  const fetchGuide = useCallback(
    async (forceRefetch = false) => {
      if (!id || !apiClient?.getById) {
        setLoading(false);
        return;
      }

      // ✅ Prevent duplicate requests for the same ID
      if (
        !forceRefetch &&
        lastFetchedId.current === id &&
        isInitialized.current
      ) {
        console.log('🚫 Skipping fetch - already loaded:', id);
        return;
      }

      try {
        console.log('🚀 Fetching guide with ID:', id);
        setLoading(true);
        setError(null);

        const response = await apiClient.getById(id);

        console.log('📦 Guide response:', response);

        if (response?.data) {
          const transformedGuide: Guide = {
            id: response.data.id,
            title: response.data.title,
            content: response.data.content,
            description:
              response.data.content?.substring(0, 120) + '...' ||
              'No description available',
            category: 'Academics',
            readTime: `${Math.ceil(
              (response.data.content?.split(' ').length || 0) / 200
            )} min read`,
            likes:
              (response.data as any).likesCount || response.data.likes || 0,
            author: 'UniVibe Team',
            createdAt: response.data.createdAt,
            status: response.data.status,
          };

          setGuide(transformedGuide);
          lastFetchedId.current = id; // ✅ Mark as fetched
          console.log('✅ Guide loaded:', transformedGuide.title);
        } else {
          console.log('❌ No guide data found');
          setError('Guide not found');
        }
      } catch (err) {
        console.error('💥 Error fetching guide:', err);
        setError(err instanceof Error ? err.message : 'Failed to load guide');
      } finally {
        setLoading(false);
        isInitialized.current = true;
      }
    },
    [id, apiClient]
  );

  // ✅ Only fetch when ID changes or on first mount
  useEffect(() => {
    // Reset state when ID changes
    if (lastFetchedId.current !== id) {
      setGuide(null);
      setLoading(true);
      setError(null);
      isInitialized.current = false;
    }

    // Fetch if not already loaded
    if (!isInitialized.current || lastFetchedId.current !== id) {
      fetchGuide();
    }
  }, [id]); // ✅ Only depend on ID

  const refetch = useCallback(() => {
    return fetchGuide(true);
  }, [fetchGuide]);

  return {
    guide,
    loading,
    error,
    refetch,
  };
};
