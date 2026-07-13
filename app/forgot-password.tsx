import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react-native';
import { showMessage } from 'react-native-flash-message';

const { width } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Step = 'email' | 'otp' | 'newPassword';

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepDots({ current }: { current: Step }) {
  const steps: Step[] = ['email', 'otp', 'newPassword'];
  return (
    <View style={styles.stepDots}>
      {steps.map(s => (
        <View
          key={s}
          style={[styles.stepDot, s === current && styles.stepDotActive]}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<Array<TextInput | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);

  // ─── Step 1: Send reset email ─────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!email.trim()) {
      showMessage({ message: 'Enter your email', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      showMessage({
        message: 'Check your email for the code!',
        type: 'success',
      });
      setStep('otp');
    } catch {
      // Even on failure, advance to OTP so users can try the code they got
      showMessage({
        message: `If that email exists you'll receive a code shortly.`,
        type: 'info',
      });
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP input handlers ───────────────────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showMessage({ message: 'Enter all 6 digits', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      });
      if (!res.ok) throw new Error('Invalid code');
      setStep('newPassword');
    } catch {
      showMessage({
        message: 'Invalid or expired code. Try again.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Reset password ───────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showMessage({
        message: 'Password must be at least 6 characters',
        type: 'danger',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage({ message: 'Passwords do not match', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.join(''),
          newPassword,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      showMessage({
        message: '🎉 Password reset!',
        description: 'You can now sign in with your new password.',
        type: 'success',
      });
      router.replace('/login');
    } catch {
      showMessage({
        message: 'Something went wrong. Please try again.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Header config per step ───────────────────────────────────────────────
  const headerConfig = {
    email: {
      badge: 'RESET PASSWORD',
      headline: 'Forgot your\npassword? 🔑',
      subtitle: "Enter your university email and we'll send you a reset code.",
    },
    otp: {
      badge: 'CHECK YOUR EMAIL',
      headline: 'Enter the\ncode 📬',
      subtitle: `We sent a 6-digit code to ${
        email || 'your email'
      }. Check your inbox.`,
    },
    newPassword: {
      badge: 'ALMOST THERE',
      headline: 'Create a new\npassword 🔒',
      subtitle: "Choose a strong password you haven't used before.",
    },
  };

  const { badge, headline, subtitle } = headerConfig[step];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={['#4B1FA8', '#7B2FBE', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.orb1} />
          <View style={styles.orb2} />

          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              step === 'email'
                ? router.back()
                : setStep(step === 'otp' ? 'email' : 'otp')
            }
          >
            <ArrowLeft size={20} color='#fff' strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>{badge}</Text>
          </View>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>

          <StepDots current={step} />
        </LinearGradient>

        {/* ── Form Section ── */}
        <View style={styles.formContainer}>
          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>University email</Text>
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
                    value={email}
                    onChangeText={setEmail}
                    keyboardType='email-address'
                    autoCapitalize='none'
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSendEmail}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#F43F5E', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color='#fff' />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send reset code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 'otp' && (
            <>
              <Text style={styles.otpLabel}>Enter your 6-digit code</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => {
                      otpRefs.current[i] = r;
                    }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={t => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) =>
                      handleOtpKeyPress(nativeEvent.key, i)
                    }
                    keyboardType='number-pad'
                    maxLength={1}
                    selectTextOnFocus
                    textAlign='center'
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#F43F5E', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color='#fff' />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendEmail}
              >
                <Text style={styles.resendBtnText}>
                  Didn't get it? Resend code
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 'newPassword' && (
            <>
              {/* Success indicator */}
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={16} color='#10B981' strokeWidth={2.5} />
                <Text style={styles.verifiedText}>Code verified ✓</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New password</Text>
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
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNew}
                    autoCapitalize='none'
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(v => !v)}
                    style={styles.eyeBtn}
                  >
                    {showNew ? (
                      <EyeOff size={18} color='#9ca3af' strokeWidth={2} />
                    ) : (
                      <Eye size={18} color='#9ca3af' strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm new password</Text>
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    autoCapitalize='none'
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(v => !v)}
                    style={styles.eyeBtn}
                  >
                    {showConfirm ? (
                      <EyeOff size={18} color='#9ca3af' strokeWidth={2} />
                    ) : (
                      <Eye size={18} color='#9ca3af' strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#F43F5E', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color='#fff' />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Back to login */}
          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.backToLoginText}>← Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE9F8' },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  orb1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(168,85,247,0.3)',
    top: -30,
    right: -30,
  },
  orb2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(168,85,247,0.2)',
    bottom: -10,
    right: 70,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C8F135',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 1,
    fontFamily: 'Inter-Bold',
  },
  headline: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 42,
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Step dots
  stepDots: { flexDirection: 'row', gap: 8 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: '#C8F135',
    width: 24,
    borderRadius: 4,
  },

  // Form
  formContainer: {
    flex: 1,
    backgroundColor: '#EDE9F8',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  inputGroup: { marginBottom: 18 },
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
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  inputIcon: { marginRight: 8 },
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
  eyeBtn: { padding: 4 },

  // OTP
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a1a2e',
    backgroundColor: '#fff',
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  otpBoxFilled: {
    borderColor: '#7B2FBE',
    backgroundColor: '#F3E8FF',
  },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendBtnText: {
    fontSize: 14,
    color: '#7B2FBE',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },

  // Verified badge
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    fontFamily: 'Inter-SemiBold',
  },

  // Primary button
  primaryBtn: {
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#7B2FBE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnGradient: {
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },

  // Back to login
  backToLogin: { alignItems: 'center', marginTop: 20 },
  backToLoginText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },
});
