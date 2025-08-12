import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return null;
}
