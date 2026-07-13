// app/(tabs)/profile.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  User,
  Edit3,
  Check,
  X,
  CreditCard,
  GraduationCap,
  Building,
  Calendar,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi, profileApi } from '../../utils/api';
import {
  UserProfile,
  UpdateProfileRequest,
  VerifyFieldsRequest,
} from '../../utils/types';

// ─── University Data ────────────────────────────────────────────────────────
const UNIVERSITIES = [
  'University of Nigeria, Nsukka (UNN)',
  'University of Nigeria, Enugu Campus (UNEC)',
  'Enugu State University of Science and Technology (ESUT)',
  'Godfrey Okoye University (GOUNI)',
  'Caritas University',
  'Renaissance University',
  'Coal City University',
  'Peaceland University',
  'Maduka University',
  'Federal University of Allied Health Sciences, Enugu (FUAHSE)',
  'State University of Medical and Applied Sciences (SUMAS)',
];

const UNIVERSITY_DATA: Record<string, Record<string, string[]>> = {
  'Godfrey Okoye University (GOUNI)': {
    'College of Medicine': ['Medicine & Surgery (MBBS)'],
    'Faculty of Allied Health Sciences': ['Nursing Science'],
    'Faculty of Computing and Information Technology (FACIT)': [
      'Computer Science',
      'Software Engineering',
      'Cybersecurity',
      'Data Science',
    ],
    'Faculty of Law': [
      'Jurisprudence & International Law',
      'Public Law',
      'Private & Business Law',
    ],
    'Faculty of Arts': [
      'English & Literary Studies',
      'History & International Studies',
      'Music',
      'Philosophy',
    ],
    'Faculty of Management & Social Sciences': [
      'Accounting',
      'Management',
      'Public Administration',
      'Economics',
      'Political Science',
      'International Relations',
      'Mass Communication',
      'Psychology',
      'Religious Studies',
      'Sociology',
    ],
    'Faculty of Natural Sciences & Environmental Studies': [
      'Applied Biology',
      'Biotechnology',
      'Microbiology',
      'Biochemistry',
      'Chemistry',
      'Industrial Chemistry',
      'Mathematics',
      'Physics',
      'Architecture',
    ],
    'Faculty of Education': [
      'Biology Education',
      'Chemistry Education',
      'Mathematics Education',
      'Physics Education',
      'English & Literary Studies Education',
      'History & International Studies Education',
      'Economics Education',
      'Political Science & Government Education',
      'Social Studies Education',
      'Business Education',
      'Computer Science Education',
    ],
  },
  'Caritas University': {
    'Faculty of Engineering': [
      'Chemical Engineering',
      'Computer Engineering',
      'Electrical/Electronic Engineering',
      'Mechanical Engineering',
    ],
    'Faculty of Environmental Sciences': [
      'Architecture',
      'Estate Management',
      'Urban & Regional Planning',
    ],
    'Faculty of Health Sciences': [
      'Nursing Science',
      'Medical Laboratory Science',
      'Radiography & Radiation Science',
    ],
    'Faculty of Natural Sciences': [
      'Computer Science',
      'Biochemistry',
      'Microbiology',
      'Industrial Chemistry',
      'Mathematics & Statistics',
    ],
    'Faculty of Management & Social Sciences': [
      'Accounting',
      'Banking & Finance',
      'Business Administration',
      'Economics',
      'English',
      'Industrial Relations & Personnel Management (IRPM)',
      'Marketing',
      'Mass Communication',
      'Political Science',
      'Psychology',
      'Public Administration',
      'Sociology',
    ],
  },
};

// ─── Icon box colours ─────────────────────────────────────────────────────────
const ICON_COLORS: Record<string, string> = {
  person: '#C4FF0E',
  id: '#FFD93D',
  faculty: '#6BCB77',
  dept: '#4D96FF',
  level: '#FF6B9D',
  sem: '#FF9F45',
  logout: '#FF3B30',
  uni: '#A855F7',
};

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({
  iconBg,
  icon,
  label,
  value,
  hasBorder = true,
  rightEl,
}: {
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  hasBorder?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <View style={[styles.infoRow, hasBorder && styles.infoRowBorder]}>
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value ?? 'Not set'}</Text>
      </View>
      {rightEl ?? <ChevronRight size={16} color='#ccc' />}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const api = useApi();
  const profileClient = React.useMemo(() => profileApi(api), [api]);

  React.useEffect(() => {
    if (edit === 'true') {
      setEditing(true);
    }
  }, [edit]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }>({ visible: false, title: '', options: [], onSelect: () => {} });

  const [editForm, setEditForm] = useState<UpdateProfileRequest>({
    fullName: '',
    phone: '',
    department: '',
    faculty: '',
    level: 100,
    semester: 'First',
    regNumber: '',
    nin: '',
    university: '',
  });
  const [verificationFields, setVerificationFields] =
    useState<VerifyFieldsRequest>({});

  // ─── Data fetch ─────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(
    async (isRefresh = false) => {
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        const response = await profileClient.getProfile();
        if (response?.data) {
          setProfile(response.data);
          setEditForm({
            fullName: response.data.fullname || '',
            phone: response.data.phone || '',
            department: response.data.department || '',
            faculty: response.data.faculty || '',
            level: response.data.level || 100,
            semester:
              response.data.semester === 'First' ||
              response.data.semester === 'Second'
                ? response.data.semester
                : 'First',
            regNumber: response.data.regNumber || '',
            nin: response.data.nin || '',
            university: response.data.university || '',
          });
        }
      } catch {
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profileClient]
  );

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => fetchProfile(true), [fetchProfile]);

  const handleUpdateProfile = useCallback(async () => {
    if (!profile) return;
    try {
      setUpdating(true);
      const response = await profileClient.updateProfile(editForm);
      if (response?.data) {
        setProfile(response.data);
        setEditing(false);
        Alert.alert('Success', response.message || 'Profile updated!');
      }
    } catch {
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
        Alert.alert('Success', response.message || 'Verification updated!');
      }
    } catch {
      Alert.alert('Error', 'Failed to update verification status.');
    } finally {
      setVerifying(false);
    }
  }, [verificationFields, profileClient]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => router.replace('/login'),
      },
    ]);
  }, [router]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.heroBannerWrapper}>
          <LinearGradient
            colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.decorCircle} />
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>YOUR CORNER</Text>
            </View>
            <Text style={styles.heroHeading}>That's you ✦</Text>
            <Text style={styles.heroSubtitle}>
              Your academic profile and details.
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size='large' color='#7B2FBE' />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Derive display name ──────────────────────────────────────────────────
  const displayName = profile?.fullname ?? 'there';
  const firstName = displayName.split(' ')[0];

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#7B2FBE'
          />
        }
      >
        {/* ─── Hero Banner ─── */}
        <View style={styles.heroBannerWrapper}>
          <LinearGradient
            colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.decorCircle} />
            <View style={styles.heroBannerTop}>
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeText}>YOUR CORNER</Text>
              </View>
              <TouchableOpacity
                style={styles.editIconBtn}
                onPress={() => setEditing(e => !e)}
              >
                {editing ? (
                  <X size={18} color='#000' />
                ) : (
                  <Edit3 size={18} color='#000' />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.heroHeading}>
              That's you,{'\n'}
              {firstName} ✦
            </Text>
            <Text style={styles.heroSubtitle}>
              Your academic profile and details.
            </Text>
          </LinearGradient>
        </View>

        {/* ─── Error ─── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchProfile()}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Personal Information ─── */}
        <SectionCard title='Personal Information'>
          {editing ? (
            <View style={styles.editBlock}>
              <Text style={styles.editLabel}>Full name</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.fullName}
                onChangeText={v => setEditForm(f => ({ ...f, fullName: v }))}
                placeholder='Your full name'
              />
              <Text style={styles.editLabel}>Phone</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.phone}
                onChangeText={v => setEditForm(f => ({ ...f, phone: v }))}
                placeholder='+234...'
                keyboardType='phone-pad'
              />
            </View>
          ) : (
            <>
              <InfoRow
                iconBg={ICON_COLORS.person}
                icon={<User size={18} color='#000' />}
                label='Full name'
                value={profile?.fullname}
              />
              <InfoRow
                iconBg={ICON_COLORS.id}
                icon={<CreditCard size={18} color='#000' />}
                label='Email'
                value={profile?.email}
                hasBorder={false}
              />
            </>
          )}
        </SectionCard>

        {/* ─── Academic Information ─── */}
        <SectionCard title='Academic Information'>
          <InfoRow
            iconBg={ICON_COLORS.uni}
            icon={<Building size={18} color='#000' />}
            label='University'
            value={profile?.university || 'Not set'}
          />

          {/* Reg Number + verify toggle */}
          <InfoRow
            iconBg={ICON_COLORS.id}
            icon={<CreditCard size={18} color='#000' />}
            label='Registration number'
            value={profile?.regNumber || 'Not set'}
            rightEl={
              <View style={styles.verifyRow}>
                <Switch
                  value={!!verificationFields.regNumber}
                  onValueChange={v =>
                    setVerificationFields(f => ({ ...f, regNumber: v }))
                  }
                  trackColor={{ false: '#ddd', true: '#C4FF0E' }}
                  thumbColor='#fff'
                />
                <TouchableOpacity
                  style={styles.verifyLink}
                  onPress={handleVerifyFields}
                  disabled={verifying}
                >
                  <Text style={styles.verifyLinkText}>Verify</Text>
                </TouchableOpacity>
              </View>
            }
          />

          <InfoRow
            iconBg={ICON_COLORS.faculty}
            icon={<Building size={18} color='#000' />}
            label='Faculty'
            value={editing ? undefined : profile?.faculty}
          />

          <InfoRow
            iconBg={ICON_COLORS.dept}
            icon={<GraduationCap size={18} color='#000' />}
            label='Department'
            value={editing ? undefined : profile?.department}
          />

          <InfoRow
            iconBg={ICON_COLORS.level}
            icon={<Calendar size={18} color='#000' />}
            label='Level'
            value={profile?.level ? `${profile.level} Level` : 'Not set'}
          />

          <InfoRow
            iconBg={ICON_COLORS.sem}
            icon={<Calendar size={18} color='#000' />}
            label='Semester'
            value={profile?.semester || 'First'}
            hasBorder={false}
          />

          {editing && (
            <View style={styles.editBlock}>
              <Text style={styles.editLabel}>University</Text>
              <TouchableOpacity
                style={styles.editInput}
                onPress={() => {
                  setPickerModal({
                    visible: true,
                    title: 'Select University',
                    options: UNIVERSITIES,
                    onSelect: val => {
                      setEditForm(f => ({
                        ...f,
                        university: val,
                        // Reset faculty and department if new university has predefined lists
                        faculty: UNIVERSITY_DATA[val] ? '' : f.faculty,
                        department: UNIVERSITY_DATA[val] ? '' : f.department,
                      }));
                    },
                  });
                }}
              >
                <Text
                  style={{
                    color: editForm.university ? '#0D0D0D' : '#999',
                    fontWeight: '600',
                  }}
                >
                  {editForm.university || 'Select University'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.editLabel}>Faculty</Text>
              {editForm.university && UNIVERSITY_DATA[editForm.university] ? (
                <TouchableOpacity
                  style={styles.editInput}
                  onPress={() => {
                    setPickerModal({
                      visible: true,
                      title: 'Select Faculty',
                      options: Object.keys(
                        UNIVERSITY_DATA[editForm.university!]
                      ),
                      onSelect: val => {
                        setEditForm(f => ({
                          ...f,
                          faculty: val,
                          department: '', // Reset department on faculty change
                        }));
                      },
                    });
                  }}
                >
                  <Text
                    style={{
                      color: editForm.faculty ? '#0D0D0D' : '#999',
                      fontWeight: '600',
                    }}
                  >
                    {editForm.faculty || 'Select Faculty'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={styles.editInput}
                  value={editForm.faculty}
                  onChangeText={v => setEditForm(f => ({ ...f, faculty: v }))}
                  placeholder='Your faculty'
                />
              )}

              <Text style={styles.editLabel}>Department</Text>
              {editForm.university &&
              editForm.faculty &&
              UNIVERSITY_DATA[editForm.university]?.[editForm.faculty] ? (
                <TouchableOpacity
                  style={styles.editInput}
                  onPress={() => {
                    setPickerModal({
                      visible: true,
                      title: 'Select Department',
                      options:
                        UNIVERSITY_DATA[editForm.university!][
                          editForm.faculty!
                        ],
                      onSelect: val => {
                        setEditForm(f => ({ ...f, department: val }));
                      },
                    });
                  }}
                >
                  <Text
                    style={{
                      color: editForm.department ? '#0D0D0D' : '#999',
                      fontWeight: '600',
                    }}
                  >
                    {editForm.department || 'Select Department'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={styles.editInput}
                  value={editForm.department}
                  onChangeText={v =>
                    setEditForm(f => ({ ...f, department: v }))
                  }
                  placeholder='Your department'
                />
              )}
            </View>
          )}
        </SectionCard>

        {/* ─── Save / Cancel buttons (edit mode) ─── */}
        {editing && (
          <View style={styles.editActionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setEditing(false)}
            >
              <X size={16} color='#000' />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size='small' color='#000' />
              ) : (
                <>
                  <Check size={16} color='#000' />
                  <Text style={styles.saveBtnText}>Save changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Logout ─── */}
        <View style={styles.logoutWrapper}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <View
              style={[
                styles.rowIconBox,
                { backgroundColor: ICON_COLORS.logout },
              ]}
            >
              <LogOut size={18} color='#fff' />
            </View>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={pickerModal.visible}
        transparent={true}
        animationType='fade'
        onRequestClose={() => setPickerModal(p => ({ ...p, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerModal.title}</Text>
              <TouchableOpacity
                onPress={() => setPickerModal(p => ({ ...p, visible: false }))}
              >
                <X size={20} color='#000' />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerModal.options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    pickerModal.onSelect(item);
                    setPickerModal(p => ({ ...p, visible: false }));
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // ─── Hero Banner ───
  heroBannerWrapper: {
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroBanner: {
    borderRadius: 22,
    padding: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -30,
    right: -30,
  },
  heroBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seasonBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  editIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  heroHeading: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ─── Loading ───
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 40,
  },
  loadingText: { fontSize: 14, color: '#555', fontWeight: '600' },

  // ─── Error ───
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },

  // ─── Section Card ───
  sectionWrapper: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // ─── Info Row ───
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoRowBorder: { borderBottomWidth: 1.5, borderBottomColor: '#F0F0F0' },
  rowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#0D0D0D', marginTop: 1 },

  // ─── Verify toggle ───
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifyLink: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#7B2FBE',
  },
  verifyLinkText: { fontSize: 11, fontWeight: '700', color: '#7B2FBE' },

  // ─── Edit block ───
  editBlock: { paddingTop: 8, gap: 8 },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0D0D0D',
  },

  // ─── Edit action row ───
  editActionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C4FF0E',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  // ─── Logout ───
  logoutWrapper: {
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  logoutBtn: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#DC2626' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#EDE9FE',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0D',
  },
});
