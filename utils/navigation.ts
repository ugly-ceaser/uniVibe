import { useRouter } from 'expo-router';

export function openPost(router: { push: (to: any) => void }, id: string) {
  router.push({ pathname: '/post/[id]', params: { id } });
}

// ...in any list/card item onPress...
const router = useRouter();
<TouchableOpacity onPress={() => openPost(router, item.id)}>
  {/* ... */}
</TouchableOpacity>