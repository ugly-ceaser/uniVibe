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
  Phone,
  BookOpen,
  ShieldCheck,
} from 'lucide-react-native';
import { HeroBanner } from '@/components/HeroBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { coursesApi, useApi, profileApi } from '../../utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { TabTransitionWrapper } from '@/components/TabTransitionWrapper';
import {
  useProfileHierarchy,
  normalizeSemester,
} from '@/hooks/useProfileHierarchy';
import type { UserProfile, UpdateProfileRequest } from '../../utils/types';

type PickerOption = {
  id: string;
  label: string;
  sublabel?: string;
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

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <View
      style={[
        styles.verificationBadge,
        verified
          ? styles.verificationBadgeVerified
          : styles.verificationBadgePending,
      ]}
    >
      <ShieldCheck size={13} color={verified ? '#166534' : '#92400E'} />
      <Text
        style={[
          styles.verificationBadgeText,
          verified
            ? styles.verificationTextVerified
            : styles.verificationTextPending,
        ]}
      >
        {verified ? 'Verified' : 'Not verified'}
      </Text>
    </View>
  );
}

const profileToEditForm = (profile: UserProfile): UpdateProfileRequest => ({
  fullName: profile.fullname || '',
  phone: profile.phone || '',
  regNumber: profile.regNumber || '',
  nin: profile.nin || '',
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { logout, updateUser } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const api = useApi();
  const profileClient = React.useMemo(() => profileApi(api), [api]);
  const hierarchyClient = React.useMemo(() => coursesApi(api), [api]);
  const hierarchy = useProfileHierarchy(hierarchyClient);
  const handledEditParam = React.useRef(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: PickerOption[];
    onSelect: (id: string) => void;
  }>({ visible: false, title: '', options: [], onSelect: () => {} });

  const [editForm, setEditForm] = useState<UpdateProfileRequest>({
    fullName: '',
    phone: '',
    regNumber: '',
    nin: '',
  });

  // ─── Data fetch ─────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const response = await profileClient.getProfile();
        if (response?.data) {
          setProfile(response.data);
          setEditForm(profileToEditForm(response.data));
          await updateUser(response.data);
        }
      } catch {
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profileClient, updateUser]
  );

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => fetchProfile(true), [fetchProfile]);

  const beginEditing = useCallback(() => {
    if (!profile) {
      return;
    }
    setEditForm(profileToEditForm(profile));
    setEditing(true);
    void hierarchy.hydrate(profile);
  }, [hierarchy, profile]);

  const cancelEditing = useCallback(() => {
    if (profile) {
      setEditForm(profileToEditForm(profile));
    }
    setEditing(false);
  }, [profile]);

  React.useEffect(() => {
    if (edit === 'true' && profile && !handledEditParam.current) {
      handledEditParam.current = true;
      beginEditing();
      router.setParams({ edit: undefined });
    } else if (edit !== 'true') {
      handledEditParam.current = false;
    }
  }, [beginEditing, edit, profile, router]);

  const showPicker = useCallback(
    (
      title: string,
      options: PickerOption[],
      onSelect: (id: string) => void
    ) => {
      setPickerModal({ visible: true, title, options, onSelect });
    },
    []
  );

  const handleUpdateProfile = useCallback(async () => {
    if (!profile) {
      return;
    }

    const { university, faculty, department, programme, level, semester } =
      hierarchy.selection;
    const normalizedSemester = normalizeSemester(semester?.name);
    if (
      !university ||
      !faculty ||
      !department ||
      !programme ||
      !level ||
      !normalizedSemester
    ) {
      Alert.alert(
        'Complete your academic profile',
        'Select a university, faculty, department, programme, level, and semester.'
      );
      return;
    }

    if (!editForm.fullName?.trim()) {
      Alert.alert('Full name required', 'Enter your full name before saving.');
      return;
    }

    try {
      setUpdating(true);
      const response = await profileClient.updateProfile({
        ...editForm,
        university: university.name,
        faculty: faculty.name,
        department: department.name,
        programme: programme.name,
        level: level.level,
        semester: normalizedSemester,
      });
      if (response?.data) {
        setProfile(response.data);
        setEditForm(profileToEditForm(response.data));
        await updateUser(response.data);
        setEditing(false);
        Alert.alert('Success', response.message || 'Profile updated!');
      }
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  }, [profile, editForm, hierarchy.selection, profileClient, updateUser]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }, [logout, router]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <TabTransitionWrapper>
        <SafeAreaView style={styles.container} edges={['top']}>
          <HeroBanner
            badgeText="YOUR CORNER"
            title="That's you ✦"
            subtitle="Your academic profile and details."
          />
          <View style={styles.loadingBox}>
            <ActivityIndicator size='large' color='#7B2FBE' />
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        </SafeAreaView>
      </TabTransitionWrapper>
    );
  }

  // ─── Derive display name ──────────────────────────────────────────────────
  const displayName = profile?.fullname ?? 'there';
  const firstName = displayName.split(' ')[0];

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <TabTransitionWrapper>
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
          <HeroBanner
            badgeText="YOUR CORNER"
            title={`That's you,\n${firstName} ✦`}
            subtitle="Your academic profile and details."
            rightAction={
              <TouchableOpacity
                style={styles.editIconBtn}
                onPress={editing ? cancelEditing : beginEditing}
              >
                {editing ? (
                  <X size={18} color='#000' />
                ) : (
                  <Edit3 size={18} color='#000' />
                )}
              </TouchableOpacity>
            }
          />

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
                <Text style={styles.editLabel}>Registration number</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.regNumber}
                  onChangeText={v => setEditForm(f => ({ ...f, regNumber: v }))}
                  placeholder='Your registration number'
                  autoCapitalize='characters'
                />
                <Text style={styles.editLabel}>National ID number (NIN)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.nin}
                  onChangeText={v => setEditForm(f => ({ ...f, nin: v }))}
                  placeholder='Your NIN'
                  keyboardType='number-pad'
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
                  rightEl={
                    <VerificationBadge
                      verified={!!profile?.verificationStatus.email}
                    />
                  }
                />
                <InfoRow
                  iconBg={ICON_COLORS.sem}
                  icon={<Phone size={18} color='#000' />}
                  label='Phone'
                  value={profile?.phone}
                  rightEl={
                    <VerificationBadge
                      verified={!!profile?.verificationStatus.phone}
                    />
                  }
                />
                <InfoRow
                  iconBg={ICON_COLORS.id}
                  icon={<CreditCard size={18} color='#000' />}
                  label='National ID number (NIN)'
                  value={profile?.nin}
                  hasBorder={false}
                  rightEl={
                    <VerificationBadge
                      verified={!!profile?.verificationStatus.nin}
                    />
                  }
                />
              </>
            )}
          </SectionCard>

          {/* ─── Academic Information ─── */}
          <SectionCard title='Academic Information'>
            {editing ? (
              <View style={styles.editBlock}>
                <Text style={styles.editLabel}>University</Text>
                <TouchableOpacity
                  style={[styles.editInput, styles.selectButton]}
                  disabled={hierarchy.loading}
                  onPress={() =>
                    showPicker(
                      'Select University',
                      hierarchy.universities.map(item => ({
                        id: item.id,
                        label: item.name,
                        sublabel: [item.shortName, item.state]
                          .filter(Boolean)
                          .join(' · '),
                      })),
                      id => {
                        const item = hierarchy.universities.find(
                          option => option.id === id
                        );
                        if (item) {
                          void hierarchy.selectUniversity(item);
                        }
                      }
                    )
                  }
                >
                  <Text style={styles.selectButtonText}>
                    {hierarchy.selection.university?.name ||
                      'Select University'}
                  </Text>
                  <ChevronRight size={18} color='#555' />
                </TouchableOpacity>

                <Text style={styles.editLabel}>Faculty</Text>
                <TouchableOpacity
                  style={[
                    styles.editInput,
                    styles.selectButton,
                    !hierarchy.selection.university &&
                      styles.selectButtonDisabled,
                  ]}
                  disabled={
                    !hierarchy.selection.university || hierarchy.loading
                  }
                  onPress={() =>
                    showPicker(
                      'Select Faculty',
                      hierarchy.faculties.map(item => ({
                        id: item.id,
                        label: item.name,
                      })),
                      id => {
                        const item = hierarchy.faculties.find(
                          option => option.id === id
                        );
                        if (item) {
                          void hierarchy.selectFaculty(item);
                        }
                      }
                    )
                  }
                >
                  <Text style={styles.selectButtonText}>
                    {hierarchy.selection.faculty?.name || 'Select Faculty'}
                  </Text>
                  <ChevronRight size={18} color='#555' />
                </TouchableOpacity>

                <Text style={styles.editLabel}>Department</Text>
                <TouchableOpacity
                  style={[
                    styles.editInput,
                    styles.selectButton,
                    !hierarchy.selection.faculty && styles.selectButtonDisabled,
                  ]}
                  disabled={!hierarchy.selection.faculty || hierarchy.loading}
                  onPress={() =>
                    showPicker(
                      'Select Department',
                      hierarchy.departments.map(item => ({
                        id: item.id,
                        label: item.name,
                      })),
                      id => {
                        const item = hierarchy.departments.find(
                          option => option.id === id
                        );
                        if (item) {
                          void hierarchy.selectDepartment(item);
                        }
                      }
                    )
                  }
                >
                  <Text style={styles.selectButtonText}>
                    {hierarchy.selection.department?.name ||
                      'Select Department'}
                  </Text>
                  <ChevronRight size={18} color='#555' />
                </TouchableOpacity>

                <Text style={styles.editLabel}>Programme</Text>
                <TouchableOpacity
                  style={[
                    styles.editInput,
                    styles.selectButton,
                    !hierarchy.selection.department &&
                      styles.selectButtonDisabled,
                  ]}
                  disabled={
                    !hierarchy.selection.department || hierarchy.loading
                  }
                  onPress={() =>
                    showPicker(
                      'Select Programme',
                      hierarchy.programmes.map(item => ({
                        id: item.id,
                        label: item.name,
                      })),
                      id => {
                        const item = hierarchy.programmes.find(
                          option => option.id === id
                        );
                        if (item) {
                          void hierarchy.selectProgramme(item);
                        }
                      }
                    )
                  }
                >
                  <Text style={styles.selectButtonText}>
                    {hierarchy.selection.programme?.name || 'Select Programme'}
                  </Text>
                  <ChevronRight size={18} color='#555' />
                </TouchableOpacity>

                <Text style={styles.editLabel}>Level</Text>
                <TouchableOpacity
                  style={[
                    styles.editInput,
                    styles.selectButton,
                    !hierarchy.selection.programme &&
                      styles.selectButtonDisabled,
                  ]}
                  disabled={!hierarchy.selection.programme || hierarchy.loading}
                  onPress={() =>
                    showPicker(
                      'Select Level',
                      hierarchy.levels.map(item => ({
                        id: item.id,
                        label: `${item.level} Level`,
                      })),
                      id => {
                        const item = hierarchy.levels.find(
                          option => option.id === id
                        );
                        if (item) {
                          hierarchy.selectLevel(item);
                        }
                      }
                    )
                  }
                >
                  <Text style={styles.selectButtonText}>
                    {hierarchy.selection.level
                      ? `${hierarchy.selection.level.level} Level`
                      : 'Select Level'}
                  </Text>
                  <ChevronRight size={18} color='#555' />
                </TouchableOpacity>

                <Text style={styles.editLabel}>Semester</Text>
                <TouchableOpacity
                  style={[
                    styles.editInput,
                    styles.selectButton,
                    !hierarchy.selection.programme &&
                      styles.selectButtonDisabled,
                  ]}
                  disabled={!hierarchy.selection.programme || hierarchy.loading}
                  onPress={() =>
                    showPicker(
                      'Select Semester',
                      hierarchy.semesters.map(item => ({
                        id: item.id,
                        label: item.name,
                      })),
                      id => {
                        const item = hierarchy.semesters.find(
                          option => option.id === id
                        );
                        if (item) {
                          hierarchy.selectSemester(item);
                        }
                      }
                    )
                  }
                >
                  <Text style={styles.selectButtonText}>
                    {hierarchy.selection.semester?.name || 'Select Semester'}
                  </Text>
                  <ChevronRight size={18} color='#555' />
                </TouchableOpacity>

                {hierarchy.loading && (
                  <View style={styles.hierarchyStatus}>
                    <ActivityIndicator size='small' color='#7B2FBE' />
                    <Text style={styles.hierarchyStatusText}>
                      Loading academic options…
                    </Text>
                  </View>
                )}
                {hierarchy.error && (
                  <View style={styles.hierarchyErrorRow}>
                    <Text style={styles.hierarchyError}>{hierarchy.error}</Text>
                    <TouchableOpacity
                      style={styles.hierarchyRetryButton}
                      onPress={() => profile && void hierarchy.hydrate(profile)}
                    >
                      <Text style={styles.hierarchyRetryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <>
                <InfoRow
                  iconBg={ICON_COLORS.uni}
                  icon={<Building size={18} color='#000' />}
                  label='University'
                  value={profile?.university}
                />
                <InfoRow
                  iconBg={ICON_COLORS.id}
                  icon={<CreditCard size={18} color='#000' />}
                  label='Registration number'
                  value={profile?.regNumber}
                  rightEl={
                    <VerificationBadge
                      verified={!!profile?.verificationStatus.regNumber}
                    />
                  }
                />
                <InfoRow
                  iconBg={ICON_COLORS.faculty}
                  icon={<Building size={18} color='#000' />}
                  label='Faculty'
                  value={profile?.faculty}
                />
                <InfoRow
                  iconBg={ICON_COLORS.dept}
                  icon={<GraduationCap size={18} color='#000' />}
                  label='Department'
                  value={profile?.department}
                />
                <InfoRow
                  iconBg={ICON_COLORS.person}
                  icon={<BookOpen size={18} color='#000' />}
                  label='Programme'
                  value={profile?.programme}
                />
                <InfoRow
                  iconBg={ICON_COLORS.level}
                  icon={<Calendar size={18} color='#000' />}
                  label='Level'
                  value={profile?.level ? `${profile.level} Level` : null}
                />
                <InfoRow
                  iconBg={ICON_COLORS.sem}
                  icon={<Calendar size={18} color='#000' />}
                  label='Semester'
                  value={profile?.semester}
                  hasBorder={false}
                />
              </>
            )}
          </SectionCard>

          {/* ─── Save / Cancel buttons (edit mode) ─── */}
          {editing && (
            <View style={styles.editActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={cancelEditing}
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
                  onPress={() =>
                    setPickerModal(p => ({ ...p, visible: false }))
                  }
                >
                  <X size={20} color='#000' />
                </TouchableOpacity>
              </View>
              <FlatList
                data={pickerModal.options}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      pickerModal.onSelect(item.id);
                      setPickerModal(p => ({ ...p, visible: false }));
                    }}
                  >
                    <Text style={styles.modalOptionText}>{item.label}</Text>
                    {!!item.sublabel && (
                      <Text style={styles.modalOptionSublabel}>
                        {item.sublabel}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmptyText}>
                    No options are available for this selection.
                  </Text>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TabTransitionWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

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

  // ─── Verification status ───
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
  },
  verificationBadgeVerified: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  verificationBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  verificationBadgeText: { fontSize: 10, fontWeight: '800' },
  verificationTextVerified: { color: '#166534' },
  verificationTextPending: { color: '#92400E' },

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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonDisabled: { opacity: 0.45 },
  selectButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  hierarchyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  hierarchyStatusText: { fontSize: 12, fontWeight: '600', color: '#555' },
  hierarchyErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  hierarchyError: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  hierarchyRetryButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7B2FBE',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hierarchyRetryText: { fontSize: 11, fontWeight: '800', color: '#7B2FBE' },

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
  modalOptionSublabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: '#777',
  },
  modalEmptyText: {
    padding: 24,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
});
