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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { showMessage } from 'react-native-flash-message';
import { testConnection } from '@/utils/api';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
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

      showMessage({
        message: 'Login Successful',
        description: 'Welcome back!',
        type: 'success',
        icon: 'success',
      });

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

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {/* Header gradient section */}
        <LinearGradient
          colors={['#4B1FA8', '#7B2FBE', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Decorative orbs */}
          <View style={styles.orb1} />
          <View style={styles.orb2} />

          {/* Pill badge */}
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>WELCOME BACK</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>{"Let's get\nyou in ⚡"}</Text>
          <Text style={styles.headerSubtitle}>
            Sign in to keep the streak going.
          </Text>
        </LinearGradient>

        {/* Form section */}
        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Mail
                size={18}
                color='#9ca3af'
                strokeWidth={2}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder='you@university.edu'
                placeholderTextColor='#9ca3af'
                value={formData.email}
                onChangeText={value => handleInputChange('email', value)}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock
                size={18}
                color='#9ca3af'
                strokeWidth={2}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder='••••••••'
                placeholderTextColor='#9ca3af'
                value={formData.password}
                onChangeText={value => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={18} color='#9ca3af' strokeWidth={2} />
                ) : (
                  <Eye size={18} color='#9ca3af' strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={isSubmitting}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            style={[
              styles.signInButton,
              (isSubmitting || isLoading) && styles.signInButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F43F5E', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInGradient}
            >
              <Text style={styles.signInButtonText}>
                {isSubmitting ? 'Signing In...' : 'Sign in'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>New here? </Text>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              disabled={isSubmitting}
            >
              <Text style={styles.registerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9F8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 70,
    paddingBottom: 48,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  orb1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
    top: -30,
    right: -30,
  },
  orb2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    bottom: 10,
    right: 60,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C8F135',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 1,
    fontFamily: 'Inter-Bold',
  },
  headline: {
    fontSize: 40,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 46,
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter-Regular',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#EDE9F8',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
    paddingVertical: 13,
    fontFamily: 'Inter-Regular',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  eyeButton: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotPasswordText: {
    color: '#7B2FBE',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  signInButton: {
    borderRadius: 14,
    marginBottom: 28,
    shadowColor: '#7B2FBE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInGradient: {
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  registerLink: {
    color: '#7B2FBE',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
});
