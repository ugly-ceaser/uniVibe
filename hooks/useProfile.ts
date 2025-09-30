import { useState, useEffect } from 'react';
import { Profile, profileApi } from '@/utils/api';
import { useApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = useApi();
  const { token } = useAuth();
  const apiClient = React.useMemo(() => profileApi(api), [api]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('response123');
      const response = await apiClient.getProfile();
      console.log('response', response);
      setProfile(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  return { profile, loading, error, refetchProfile: fetchProfile };
}
