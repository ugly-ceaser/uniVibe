import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  BookOpen,
  Settings,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  CreditCard as Edit3,
  ChevronRight,
} from 'lucide-react-native';
import { profileApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch profile from API
  const fetchProfile = async () => {
    setLoading(true);
    try {
    const data = await profileApi.getProfile();
    console.log('Profile API response:', data); // <-- Log API response here
    setUser(data.data);
  } catch (error) {
    console.log('Profile fetch error:', error); // <-- Log any fetch errors
    Alert.alert('Error', 'Unable to fetch profile');
  } finally {
    setLoading(false);
  }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditProfile = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      await profileApi.updateProfile({
        fullname: user.fullname,
        phone: user.phone,
        department: user.department,
        faculty: user.faculty,
        level: user.level,
        semester: user.semester,
      });
      Alert.alert('Success', 'Profile updated successfully');
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', 'Unable to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyField = async (field: 'email' | 'phone' | 'nin' | 'regNumber') => {
    if (!user) return;
    setVerifying(field);
    try {
      await profileApi.verifyField({ [field]: true });
      Alert.alert('Success', `${field} verification request sent!`);
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', `Unable to verify ${field}`);
    } finally {
      setVerifying(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => router.replace('/login'),
      },
    ]);
  };

  const menuItems = [
    {
      icon: Settings,
      title: 'Account Settings',
      subtitle: 'Manage your account preferences',
      onPress: () => Alert.alert('Settings', 'Settings page coming soon!'),
    },
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Configure notification preferences',
      onPress: () => Alert.alert('Notifications', 'Notification settings coming soon!'),
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      subtitle: 'Manage your privacy settings',
      onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon!'),
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Help', 'Help center coming soon!'),
    },
  ];

  if (loading || !user ) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
          activeOpacity={0.7}
          disabled={updating}
        >
          <Edit3 size={20} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <User size={40} color="#667eea" strokeWidth={2} />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.fullname}</Text>
            <Text style={styles.userLevel}>
              {user.level} • {user.department}
            </Text>
            <Text style={styles.studentId}>ID: {user.studentId || user.regNumber}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.verificationItem}>
            <Mail size={20} color="#667eea" strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.verificationBadge,
                user.verificationStatus?.email
                  ? styles.verifiedBadge
                  : styles.unverifiedBadge,
              ]}
              onPress={() => handleVerifyField('email')}
              disabled={verifying === 'email'}
            >
              <Text
                style={[
                  styles.verificationText,
                  user.verificationStatus?.email
                    ? styles.verifiedText
                    : styles.unverifiedText,
                ]}
              >
                {verifying === 'email'
                  ? 'Verifying...'
                  : user.verificationStatus?.email
                  ? 'Verified'
                  : 'Verify'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.verificationItem}>
            <Phone size={20} color="#667eea" strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.verificationBadge,
                user.verificationStatus?.phone
                  ? styles.verifiedBadge
                  : styles.unverifiedBadge,
              ]}
              onPress={() => handleVerifyField('phone')}
              disabled={verifying === 'phone'}
            >
              <Text
                style={[
                  styles.verificationText,
                  user.verificationStatus?.phone
                    ? styles.verifiedText
                    : styles.unverifiedText,
                ]}
              >
                {verifying === 'phone'
                  ? 'Verifying...'
                  : user.verificationStatus?.phone
                  ? 'Verified'
                  : 'Verify'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Verification</Text>

          <View style={styles.verificationItem}>
            <Shield size={20} color="#667eea" strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>National ID Number (NIN)</Text>
              <Text style={styles.infoValue}>{user.nin}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.verificationBadge,
                user.verificationStatus?.nin
                  ? styles.verifiedBadge
                  : styles.unverifiedBadge,
              ]}
              onPress={() => handleVerifyField('nin')}
              disabled={verifying === 'nin'}
            >
              <Text
                style={[
                  styles.verificationText,
                  user.verificationStatus?.nin
                    ? styles.verifiedText
                    : styles.unverifiedText,
                ]}
              >
                {verifying === 'nin'
                  ? 'Verifying...'
                  : user.verificationStatus?.nin
                  ? 'Verified'
                  : 'Verify'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.verificationItem}>
            <BookOpen size={20} color="#667eea" strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Registration Number</Text>
              <Text style={styles.infoValue}>{user.regNumber}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.verificationBadge,
                user.verificationStatus?.regNumber
                  ? styles.verifiedBadge
                  : styles.unverifiedBadge,
              ]}
              onPress={() => handleVerifyField('regNumber')}
              disabled={verifying === 'regNumber'}
            >
              <Text
                style={[
                  styles.verificationText,
                  user.verificationStatus?.regNumber
                    ? styles.verifiedText
                    : styles.unverifiedText,
                ]}
              >
                {verifying === 'regNumber'
                  ? 'Verifying...'
                  : user.verificationStatus?.regNumber
                  ? 'Verified'
                  : 'Verify'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Academic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>

          <View style={styles.infoItem}>
            <BookOpen size={20} color="#667eea" strokeWidth={2} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Current Semester</Text>
              <Text style={styles.infoValue}>{user.semester}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <item.icon size={20} color="#667eea" strokeWidth={2} />
              </View>

              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>

              <ChevronRight size={20} color="#9ca3af" strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#ef4444" strokeWidth={2} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Keep your existing styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  backButton: { padding: 8 },
  editButton: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  userInfo: {},
  userName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  userLevel: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  studentId: { fontSize: 12, color: '#9ca3af' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  verificationItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoContent: { flex: 1, marginLeft: 12 },
  infoLabel: { fontSize: 14, color: '#374151' },
  infoValue: { fontSize: 14, color: '#6b7280' },
  verificationBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  verifiedBadge: { backgroundColor: '#d1fae5' },
  unverifiedBadge: { backgroundColor: '#fee2e2' },
  verificationText: { fontSize: 12, fontWeight: '500' },
  verifiedText: { color: '#059669' },
  unverifiedText: { color: '#b91c1c' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIconContainer: { width: 36, alignItems: 'center' },
  menuContent: { flex: 1, marginLeft: 12 },
  menuTitle: { fontSize: 14, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, color: '#6b7280' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  logoutText: { marginLeft: 8, fontSize: 14, color: '#ef4444', fontWeight: '600' },
});
