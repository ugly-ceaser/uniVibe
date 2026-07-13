import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * request-courses.tsx – Backward-compatibility redirect.
 * Old deep links / buttons that pointed to /request-courses now forward to /submit-course.
 */
export default function RequestCoursesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Use replace so the back button doesn't loop back here
    router.replace('/submit-course');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size='large' color='#7B2FBE' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE9F8',
  },
});
