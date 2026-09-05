import { useCallback, useState, useEffect } from 'react';
import { profileApi } from '@/utils/api';
import { useApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/utils/types';
import React from 'react';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = useApi();
  const { token } = useAuth();
  const apiClient = React.useMemo(() => profileApi(api), [api]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getProfile();
      setProfile(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (token) {
      void fetchProfile();
    }
  }, [fetchProfile, token]);

  return { profile, loading, error, refetchProfile: fetchProfile };
}
