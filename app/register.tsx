import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import AwesomeAlert from 'react-native-awesome-alerts';
import { authApi } from '@/utils/api';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    middlename: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<
    'default' | 'checking' | 'available' | 'taken'
  >('default');

  const [alert, setAlert] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: undefined as (() => void) | undefined,
  });

  const checkUsernameAvailability = async () => {
    const username = formData.username.trim();
    if (!username) {
      setUsernameStatus('default');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await authApi.checkUsername(username.toLowerCase());
      if (res.available) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    } catch {
      setUsernameStatus('default');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'username') {
      setUsernameStatus('default');
    }
  };

  const showCustomAlert = (
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlert({ show: true, title, message, onConfirm });
  };

  const handleRegister = async () => {
    const {
      username,
      firstname,
      middlename,
      lastname,
      email,
      password,
      confirmPassword,
    } = formData;

    if (
      !username ||
      !firstname ||
      !lastname ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      showCustomAlert('⚠️ Missing Info', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      showCustomAlert('❌ Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showCustomAlert(
        '🔒 Weak Password',
        'Password must be at least 6 characters long'
      );
      return;
    }

    try {
      await register({
        username: username.trim().toLowerCase(),
        firstname: firstname.trim(),
        middlename: middlename ? middlename.trim() : null,
        lastname: lastname.trim(),
        email: email.trim(),
        password,
      });

      showCustomAlert(
        '🎉 Registration Successful!',
        'Your account has been created successfully. Please log in to continue.',
        () => router.replace('/login')
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong. Please try again.';
      showCustomAlert('⚠️ Error', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.keyboardView}>
        <ScrollView
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.pillBadgeText}>JOIN THE CREW</Text>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>{'Create your\naccount ✨'}</Text>
            <Text style={styles.headerSubtitle}>
              You're one form away from the whole campus.
            </Text>
          </LinearGradient>

          {/* Form section */}
          <View style={styles.formContainer}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <User
                  size={18}
                  color='#9ca3af'
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Choose a unique username'
                  placeholderTextColor='#9ca3af'
                  value={formData.username}
                  onChangeText={value => handleInputChange('username', value)}
                  onBlur={checkUsernameAvailability}
                  autoCapitalize='none'
                  autoCorrect={false}
                />
              </View>
              {usernameStatus !== 'default' && (
                <Text
                  style={[
                    styles.statusText,
                    usernameStatus === 'available'
                      ? styles.statusAvailable
                      : usernameStatus === 'taken'
                      ? styles.statusTaken
                      : styles.statusChecking,
                  ]}
                >
                  {usernameStatus === 'checking' && 'Checking availability...'}
                  {usernameStatus === 'available' && 'Username available 🎉'}
                  {usernameStatus === 'taken' && 'Username taken ❌'}
                </Text>
              )}
            </View>

            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First name</Text>
              <View style={styles.inputWrapper}>
                <User
                  size={18}
                  color='#9ca3af'
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Your first name'
                  placeholderTextColor='#9ca3af'
                  value={formData.firstname}
                  onChangeText={value => handleInputChange('firstname', value)}
                  autoCapitalize='words'
                />
              </View>
            </View>

            {/* Middle Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Middle name (optional)</Text>
              <View style={styles.inputWrapper}>
                <User
                  size={18}
                  color='#9ca3af'
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Your middle name'
                  placeholderTextColor='#9ca3af'
                  value={formData.middlename}
                  onChangeText={value => handleInputChange('middlename', value)}
                  autoCapitalize='words'
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last name</Text>
              <View style={styles.inputWrapper}>
                <User
                  size={18}
                  color='#9ca3af'
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Your last name'
                  placeholderTextColor='#9ca3af'
                  value={formData.lastname}
                  onChangeText={value => handleInputChange('lastname', value)}
                  autoCapitalize='words'
                />
              </View>
            </View>

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
                  autoCapitalize='none'
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm password</Text>
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
                    <EyeOff size={18} color='#9ca3af' strokeWidth={2} />
                  ) : (
                    <Eye size={18} color='#9ca3af' strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Account button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                isLoading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F43F5E', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already in? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Custom Alert */}
      <AwesomeAlert
        show={alert.show}
        showProgress={false}
        title={alert.title}
        message={alert.message}
        closeOnTouchOutside={true}
        closeOnHardwareBackPress={false}
        showConfirmButton={true}
        confirmText='Okay'
        confirmButtonColor='#7B2FBE'
        onConfirmPressed={() => {
          setAlert({ ...alert, show: false });
          if (alert.onConfirm) alert.onConfirm();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9F8',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    bottom: -10,
    right: 70,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C8F135',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 1,
    fontFamily: 'Inter-Bold',
  },
  headline: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 44,
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#EDE9F8',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
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
    paddingVertical: 12,
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
  registerButton: {
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonGradient: {
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
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
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#7B2FBE',
  },
  statusText: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'Inter-Medium',
  },
  statusChecking: {
    color: '#EAB308',
  },
  statusAvailable: {
    color: '#16A34A',
  },
  statusTaken: {
    color: '#DC2626',
  },
});
