// app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Edit3, 
  Check, 
  X,
  Phone,
  Mail,
  CreditCard,
  GraduationCap,
  Building,
  Calendar,
  Shield,
  Settings,
  LogOut,
  Camera,
  Save,
  AlertCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi, profileApi } from '../../utils/api';
import { UserProfile, UpdateProfileRequest, VerifyFieldsRequest } from '../../utils/types';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const api = useApi();
  const profileClient = React.useMemo(() => profileApi(api), [api]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit form state with default values
  const [editForm, setEditForm] = useState<UpdateProfileRequest>({
    fullName: '',
    phone: '',
    department: '',
    faculty: '',
    level: 100,
    semester: 'First',
    regNumber: '', // added
    nin: '',       // added
  });
  
  // Verification state
  const [verificationFields, setVerificationFields] = useState<VerifyFieldsRequest>({});

  const fetchProfile = React.useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Use cache unless it's a manual refresh
      const response = await profileClient.getProfile(!isRefresh);
      if (response?.data) {
        setProfile(response.data);
        setEditForm({
          fullName: response.data.fullname || '',
          phone: response.data.phone || '',
          department: response.data.department || '',
          faculty: response.data.faculty || '',
          level: response.data.level || 100,
          semester: response.data.semester || 'First',
          regNumber: response.data.regNumber || '', // added
          nin: response.data.nin || '',             // added
        });
        console.log('✅ Profile loaded successfully');
      }
    } catch (err) {
      console.error('💥 Error fetching profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileClient]);

  React.useEffect(() => {
    fetchProfile(false);
    // Fetch only once on mount
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  const handleUpdateProfile = useCallback(async () => {
    if (!profile) return;

    try {
      setUpdating(true);
      
      const response = await profileClient.updateProfile(editForm);
      
      if (response?.data) {
        setProfile(response.data);
        setEditing(false);
        Alert.alert('Success', response.message || 'Profile updated successfully');
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  }, [profile, editForm, profileClient]);

  const handleVerifyFields = useCallback(async () => {
    try {
      setVerifying(true);
      
      const response = await profileClient.verifyFields(verificationFields);
      
      if (response?.data) {
        setProfile(response.data);
        Alert.alert('Success', response.message || 'Field verification updated successfully');
      }
    } catch (err: any) {
      console.error('Failed to verify fields:', err);
      Alert.alert('Error', 'Failed to update verification status.');
    } finally {
      setVerifying(false);
    }
  }, [verificationFields, profileClient]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement logout logic
            console.log('Logging out...');
            router.replace('/auth/login');
          }
        }
      ]
    );
  }, [router]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Cleared':
        return { color: '#10b981', bgColor: '#dcfce7', text: 'Cleared' };
      case 'Pending':
        return { color: '#f59e0b', bgColor: '#fef3c7', text: 'Pending' };
      case 'Suspended':
        return { color: '#ef4444', bgColor: '#fee2e2', text: 'Suspended' };
      default:
        return { color: '#6b7280', bgColor: '#f3f4f6', text: status || 'Unknown' };
    }
  };

  const renderProfileField = (
    icon: React.ElementType,
    label: string,
    value: string | number | null | undefined,
    editable: boolean = false,
    verifiable: boolean = false,
    fieldKey?: keyof UpdateProfileRequest,
    verifyKey?: keyof VerifyFieldsRequest
  ) => {
    const Icon = icon;
    const isEditing = editing && editable;
    
    // Safely convert value to string with fallback
    const displayValue = value !== null && value !== undefined ? String(value) : 'Not set';
    
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Icon size={16} color="#6b7280" />
            <Text style={styles.fieldLabel}>{label}</Text>
          </View>
          {verifiable && (
            <View style={styles.verificationContainer}>
              <Switch
                value={verificationFields[verifyKey!] || false}
                onValueChange={(value) => 
                  setVerificationFields(prev => ({ ...prev, [verifyKey!]: value }))
                }
                trackColor={{ false: '#f3f4f6', true: '#dcfce7' }}
                thumbColor={verificationFields[verifyKey!] ? '#10b981' : '#9ca3af'}
              />
              <Text style={styles.verifyLabel}>Verify</Text>
            </View>
          )}
        </View>
        
        {isEditing ? (
          <TextInput
            style={styles.fieldInput}
            value={editForm[fieldKey!] ? String(editForm[fieldKey!]) : ''}
            onChangeText={(text) => {
              if (fieldKey === 'level') {
                // Handle numeric input for level
                const numericValue = parseInt(text) || 100;
                setEditForm(prev => ({ ...prev, [fieldKey]: numericValue }));
              } else {
                setEditForm(prev => ({ ...prev, [fieldKey!]: text }));
              }
            }}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#9ca3af"
            keyboardType={fieldKey === 'level' ? 'numeric' : 'default'}
          />
        ) : (
          <Text style={styles.fieldValue}>{displayValue}</Text>
        )}
      </View>
    );
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Failed to load profile'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfile()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(profile.status);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    setEditing(false);
                    // Reset form to current profile data
                    setEditForm({
                      fullName: profile.fullname || '',
                      phone: profile.phone || '',
                      department: profile.department || '',
                      faculty: profile.faculty || '',
                      level: profile.level || 100,
                      semester: profile.semester || 'First',
                      regNumber: profile.regNumber || '', // added
                      nin: profile.nin || '',             // added
                    });
                  }}
                >
                  <X size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleUpdateProfile}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Save size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setEditing(true)}
              >
                <Edit3 size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.sectionContent}>
            {renderProfileField(User, 'Full Name', profile.fullname, true, false, 'fullName')}
          </View>
        </View>

        {/* Academic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.sectionContent}>
            {renderProfileField(CreditCard, 'Registration Number', profile.regNumber, true, true, 'regNumber', 'regNumber')}
            {renderProfileField(Building, 'Faculty', profile.faculty, true, false, 'faculty')}
            {renderProfileField(GraduationCap, 'Department', profile.department, true, false, 'department')}
            {renderProfileField(Calendar, 'Level', profile.level, true, false, 'level')}
            {renderProfileField(Calendar, 'Semester', profile.semester, true, false, 'semester')}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.sectionContent}>
            {renderProfileField(Mail, 'Email', profile.email, false, true, undefined, 'email')}
            {renderProfileField(Phone, 'Phone', profile.phone, true, true, 'phone', 'phone')}
            {renderProfileField(CreditCard, 'NIN', profile.nin, true, true, 'nin', 'nin')}
          </View>
        </View>

        {/* Verification Actions */}
        {Object.keys(verificationFields).length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyFields}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Shield size={16} color="#ffffff" />
                  <Text style={styles.verifyButtonText}>Update Verification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.settingItem}>
              <Settings size={20} color="#6b7280" />
              <Text style={styles.settingText}>App Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={[styles.settingText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Profile Header
  profileHeader: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Profile Fields
  fieldContainer: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Buttons
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Settings
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
});

