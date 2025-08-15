import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Shield,
  BookOpen,
} from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }


    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }


    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      // Error handling is done in the auth context
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color='#ffffff' strokeWidth={2} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSubtitle}>
                Join the Fresher Companion community
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <User size={20} color='#9ca3af' strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder='Full Name'
                  value={formData.name}
                  onChangeText={value => handleInputChange('name', value)}
                  autoCapitalize='words'
                />
              </View>

              <View style={styles.inputWrapper}>
                <Mail size={20} color='#9ca3af' strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder='Email address'
                  value={formData.email}
                  onChangeText={value => handleInputChange('email', value)}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color='#9ca3af' strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder='Password'
                  value={formData.password}
                  onChangeText={value => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize='none'
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff size={20} color='#9ca3af' strokeWidth={2} />
                  ) : (
                    <Eye size={20} color='#9ca3af' strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color='#9ca3af' strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder='Confirm Password'
                  value={formData.confirmPassword}
                  onChangeText={value =>
                    handleInputChange('confirmPassword', value)
                  }
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize='none'
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color='#9ca3af' strokeWidth={2} />
                  ) : (
                    <Eye size={20} color='#9ca3af' strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                isLoading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.registerButtonGradient}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1f2937',
    marginLeft: 12,
  },
  eyeButton: {
    padding: 4,
  },
  registerButton: {
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
});
