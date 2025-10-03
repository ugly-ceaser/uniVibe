import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { showMessage } from 'react-native-flash-message';
import { testConnection } from '@/utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    // Test connection on component mount
    const checkConnection = async () => {
      console.log('Testing API connection...');
      const isConnected = await testConnection();
      console.log('API connection status:', isConnected);
    };

    checkConnection();
  }, []);

  const handleSubmit = async () => {
    const { email, password } = formData;

    if (!email || !password) {
      showMessage({
        message: 'Missing Information',
        description: 'Please enter both email and password.',
        type: 'danger',
        icon: 'danger',
      });
      return;
    }

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      Alert.alert(
        'Connection Error',
        'Cannot connect to the server. Please check your internet connection and try again.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      // Success feedback
      showMessage({
        message: 'Login Successful',
        description: 'Welcome back!',
        type: 'success',
        icon: 'success',
      });

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);

      if (error?.status === 429) {
        showMessage({
          message: 'Too Many Attempts',
          description: 'Please wait a moment before trying again.',
          type: 'danger',
          icon: 'danger',
        });
      } else if (
        error?.status === 0 ||
        error?.message?.includes('Failed to connect')
      ) {
        showMessage({
          message: 'Connection Error',
          description:
            'Cannot connect to the server. Please check your internet connection',
          type: 'danger',
          icon: 'danger',
        });
      } else {
        showMessage({
          message: 'Login Failed',
          description:
            error?.message || 'Please check your credentials and try again.',
          type: 'danger',
          icon: 'danger',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegisterPress = () => {
    router.push('/register');
  };

  const handleForgotPassword = () => {
    showMessage({
      message: 'Forgot Password',
      description: 'Please contact your administrator to reset your password.',
      type: 'info',
      icon: 'info',
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your learning journey
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder='Enter your email'
                placeholderTextColor='#9ca3af'
                value={formData.email}
                onChangeText={value => handleInputChange('email', value)}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder='Enter your password'
                placeholderTextColor='#9ca3af'
                value={formData.password}
                onChangeText={value => handleInputChange('password', value)}
                secureTextEntry
                editable={!isSubmitting}
              />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              disabled={isSubmitting}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (isSubmitting || isLoading) && styles.loginButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={handleRegisterPress}
                disabled={isSubmitting}
              >
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    fontFamily: 'Inter_400Regular',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  loginButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  registerLink: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
