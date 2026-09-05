import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STORAGE_KEY } from '@/utils/authSession';

export const hasCompletedOnboarding = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === 'true';

export const markOnboardingComplete = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
};
