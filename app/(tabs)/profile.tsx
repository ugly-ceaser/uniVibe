import React from 'react';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileTab() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main profile page
    router.replace('/profile');
  }, []);

  return null;
}