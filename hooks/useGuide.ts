import { useCallback, useEffect, useMemo, useState } from 'react';
import { guideApi, useApi } from '@/utils/api';
import type { Guide } from '@/types/guide';

interface UseGuideReturn {
  guide: Guide | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateGuide: (update: Partial<Guide>) => void;
}

export const useGuide = (id: string | undefined): UseGuideReturn => {
  const api = useApi();
  const client = useMemo(() => guideApi(api), [api]);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) {
      setGuide(null);
      setError('Guide not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await client.getById(id);
      if (!response.data.id) throw new Error('Guide not found');
      setGuide(response.data);
    } catch (error) {
      setGuide(null);
      setError(error instanceof Error ? error.message : 'Failed to load guide');
    } finally {
      setLoading(false);
    }
  }, [client, id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const updateGuide = useCallback((update: Partial<Guide>) => {
    setGuide(current => (current ? { ...current, ...update } : current));
  }, []);

  return { guide, loading, error, refetch, updateGuide };
};
