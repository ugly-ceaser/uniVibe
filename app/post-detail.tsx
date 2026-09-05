import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyPostRedirect() {
  const { postId } = useLocalSearchParams<{ postId?: string | string[] }>();
  const id = Array.isArray(postId) ? postId[0] : postId;

  return id ? (
    <Redirect href={{ pathname: '/post/[id]', params: { id } }} />
  ) : (
    <Redirect href='/(tabs)/forum' />
  );
}
