import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  BookOpen,
  Hash,
  Layers,
  X,
  Sparkles,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showMessage } from 'react-native-flash-message';
import { useApi, coursesApi, profileApi } from '@/utils/api';

interface SelectItem {
  id: string;
  label: string;
  sublabel?: string;
}

function SelectModal({
  visible,
  title,
  items,
  onSelect,
  onClose,
  loading,
}: {
  visible: boolean;
  title: string;
  items: SelectItem[];
  onSelect: (item: SelectItem) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent
      onRequestClose={onClose}
    >
      <View style={sm.overlay}>
        <View style={sm.sheet}>
          <View style={sm.header}>
            <Text style={sm.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={sm.closeBtn}>
              <X size={20} color='#000' />
            </TouchableOpacity>
          </View>
          <View style={sm.searchRow}>
            <Search size={16} color='#666' style={{ marginRight: 8 }} />
            <TextInput
              style={sm.searchInput}
              placeholder='Search…'
              value={q}
              onChangeText={setQ}
              placeholderTextColor='#999'
              {...(Platform.OS === 'web'
                ? ({ outlineStyle: 'none' } as any)
                : {})}
            />
          </View>
          {loading ? (
            <ActivityIndicator
              size='large'
              color='#7B2FBE'
              style={{ marginTop: 32 }}
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={<Text style={sm.empty}>No results</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={sm.item}
                  onPress={() => {
                    onSelect(item);
                    setQ('');
                  }}
                >
                  <Text style={sm.itemLabel}>{item.label}</Text>
                  {item.sublabel ? (
                    <Text style={sm.itemSub}>{item.sublabel}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a2e' },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
});

function SelectField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.selectField}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.selectFieldText, !value && styles.selectPlaceholder]}
      >
        {value ?? label}
      </Text>
      <ChevronDown size={18} color='#666' />
    </TouchableOpacity>
  );
}

export default function SubmitCourseScreen() {
  const router = useRouter();
  const api = useApi();
  const client = useMemo(() => coursesApi(api), [api]);
  const profileClient = useMemo(() => profileApi(api), [api]);
  const isFetchingRef = useRef(false);
  const lastProfileRef = useRef<{
    university?: string | null;
    faculty?: string | null;
    department?: string | null;
    programme?: string | null;
    level?: number | null;
    semester?: string | null;
  } | null>(null);

  // Profile-resolved hierarchy (not shown in UI)
  const [selectedUniversity, setSelectedUniversity] =
    useState<SelectItem | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<SelectItem | null>(
    null
  );
  const [selectedDepartment, setSelectedDepartment] =
    useState<SelectItem | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<SelectItem | null>(
    null
  );

  const [levels, setLevels] = useState<SelectItem[]>([]);
  const [semesters, setSemesters] = useState<SelectItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<SelectItem | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<SelectItem | null>(
    null
  );

  const [openModal, setOpenModal] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  // Course details
  const [courseCode, setCourseCode] = useState('');
  const [title, setTitle] = useState('');
  const [creditUnit, setCreditUnit] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    courseCode: string;
    courseTitle: string;
  } | null>(null);

  const loadProfileHierarchy = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setProfileLoading(true);
    try {
      const [uniRes, profileRes] = await Promise.all([
        client.getUniversities(),
        profileClient.getProfile(),
      ]);

      const rawUnis = uniRes?.data ?? [];
      const userProfile = profileRes?.data;
      if (!userProfile) {
        setIsProfileIncomplete(true);
        return;
      }

      const uniName = userProfile.university?.trim();
      const facName = userProfile.faculty?.trim();
      const deptName = userProfile.department?.trim();
      const programmeName = userProfile.programme?.trim();
      const incomplete =
        !uniName ||
        !facName ||
        !deptName ||
        !userProfile.level ||
        !userProfile.semester;
      if (incomplete) {
        setIsProfileIncomplete(true);
        return;
      }

      const lp = lastProfileRef.current;
      const profileChanged =
        !lp ||
        lp.university !== userProfile.university ||
        lp.faculty !== userProfile.faculty ||
        lp.department !== userProfile.department ||
        lp.programme !== userProfile.programme ||
        lp.level !== userProfile.level ||
        lp.semester !== userProfile.semester;
      if (!profileChanged) {
        return;
      }

      lastProfileRef.current = {
        university: userProfile.university,
        faculty: userProfile.faculty,
        department: userProfile.department,
        programme: userProfile.programme,
        level: userProfile.level,
        semester: userProfile.semester,
      };

      const matchedUni = rawUnis.find(
        (u: any) =>
          u.name.toLowerCase().includes(uniName.toLowerCase()) ||
          uniName.toLowerCase().includes(u.name.toLowerCase()) ||
          u.shortName?.toLowerCase().includes(uniName.toLowerCase()) ||
          (u.shortName &&
            uniName.toLowerCase().includes(u.shortName.toLowerCase()))
      );
      if (!matchedUni) {
        setIsProfileIncomplete(true);
        return;
      }

      setSelectedUniversity({ id: matchedUni.id, label: matchedUni.name });

      const facsRes = await client.getFaculties(matchedUni.id);
      const rawFacs = facsRes?.data ?? [];
      const matchedFac = rawFacs.find(
        (f: any) =>
          f.name.toLowerCase().includes(facName.toLowerCase()) ||
          facName.toLowerCase().includes(f.name.toLowerCase())
      );
      if (!matchedFac) {
        setIsProfileIncomplete(true);
        return;
      }

      setSelectedFaculty({ id: matchedFac.id, label: matchedFac.name });

      const deptsRes = await client.getDepartments(matchedFac.id);
      const rawDepts = deptsRes?.data ?? [];

      let matchedDept = rawDepts.find(
        (d: any) =>
          d.name.toLowerCase().includes(deptName.toLowerCase()) ||
          deptName.toLowerCase().includes(d.name.toLowerCase())
      );
      let matchedProg = null;

      if (matchedDept) {
        setSelectedDepartment({ id: matchedDept.id, label: matchedDept.name });
        const progsRes = await client.getProgrammes(matchedDept.id);
        const rawProgs = progsRes?.data ?? [];
        if (programmeName) {
          matchedProg =
            rawProgs.find(
              (p: any) =>
                p.name.toLowerCase().includes(programmeName.toLowerCase()) ||
                programmeName.toLowerCase().includes(p.name.toLowerCase())
            ) || null;
        } else if (rawProgs.length > 0) {
          matchedProg = rawProgs[0];
        }
      }

      if (!matchedProg && programmeName) {
        // Try searching for a programme match across all departments in this faculty
        for (const dept of rawDepts) {
          const progsRes = await client.getProgrammes(dept.id);
          const rawProgs = progsRes?.data ?? [];
          const foundProg = rawProgs.find(
            (p: any) =>
              p.name.toLowerCase().includes(programmeName.toLowerCase()) ||
              programmeName.toLowerCase().includes(p.name.toLowerCase())
          );
          if (foundProg) {
            matchedDept = dept;
            matchedProg = foundProg;
            break;
          }
        }
        if (matchedDept && matchedProg) {
          setSelectedDepartment({
            id: matchedDept.id,
            label: matchedDept.name,
          });
        }
      }

      if (!matchedDept || !matchedProg) {
        setIsProfileIncomplete(true);
        return;
      }

      setSelectedProgramme({ id: matchedProg.id, label: matchedProg.name });

      const [lvlRes, semRes] = await Promise.all([
        client.getLevels(matchedProg.id),
        client.getSemesters(matchedProg.id),
      ]);

      const rawLvls = lvlRes?.data ?? [];
      const rawSems = semRes?.data ?? [];

      const uniqueLvls: SelectItem[] = [];
      const lvlSeen = new Set<string>();
      rawLvls.forEach((l: any) => {
        const label = `Level ${l.level}`;
        if (!lvlSeen.has(label)) {
          lvlSeen.add(label);
          uniqueLvls.push({ id: l.id, label });
        }
      });
      setLevels(uniqueLvls);

      const uniqueSems: SelectItem[] = [];
      const semSeen = new Set<string>();
      rawSems.forEach((s: any) => {
        const label = s.name;
        if (!semSeen.has(label)) {
          semSeen.add(label);
          uniqueSems.push({ id: s.id, label });
        }
      });
      setSemesters(uniqueSems);

      const matchedLvl = rawLvls.find(
        (l: any) => l.level === Number(userProfile.level)
      );
      if (matchedLvl) {
        setSelectedLevel({
          id: matchedLvl.id,
          label: `Level ${matchedLvl.level}`,
        });
      }

      const matchedSem = rawSems.find((s: any) => {
        const sName = s.name.toLowerCase();
        const pSem = (userProfile.semester || '').toLowerCase();
        return (
          sName.includes(pSem) ||
          pSem.includes(sName) ||
          (pSem.includes('first') && sName.includes('first')) ||
          (pSem.includes('second') && sName.includes('second'))
        );
      });
      if (matchedSem) {
        setSelectedSemester({ id: matchedSem.id, label: matchedSem.name });
      }

      if (matchedUni && matchedFac && matchedDept && matchedProg) {
        setIsProfileIncomplete(false);
      } else {
        setIsProfileIncomplete(true);
      }
    } catch {
      setIsProfileIncomplete(true);
    } finally {
      setProfileLoading(false);
      isFetchingRef.current = false;
    }
  }, [client, profileClient]);

  useFocusEffect(
    useCallback(() => {
      loadProfileHierarchy();
    }, [loadProfileHierarchy])
  );

  const handleSubmit = async () => {
    if (
      isProfileIncomplete ||
      !selectedUniversity ||
      !selectedFaculty ||
      !selectedDepartment ||
      !selectedProgramme
    ) {
      showMessage({
        message: 'Profile Incomplete',
        description:
          'Please set your university, faculty, and department in your profile first.',
        type: 'warning',
      });
      return;
    }
    if (!selectedLevel || !selectedSemester) {
      showMessage({
        message: 'Incomplete',
        description: 'Please select level and semester.',
        type: 'warning',
      });
      return;
    }
    if (!courseCode.trim() || !title.trim() || !creditUnit.trim()) {
      showMessage({
        message: 'Missing Fields',
        description: 'Please fill in course code, title, and credit unit.',
        type: 'danger',
      });
      return;
    }
    if (
      isNaN(Number(creditUnit)) ||
      Number(creditUnit) < 1 ||
      Number(creditUnit) > 12
    ) {
      showMessage({
        message: 'Invalid Credit Unit',
        description: 'Credit unit must be a number between 1 and 12.',
        type: 'danger',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await client.submitCourse({
        universityId: selectedUniversity.id,
        facultyId: selectedFaculty.id,
        departmentId: selectedDepartment.id,
        programmeId: selectedProgramme.id,
        levelId: selectedLevel.id,
        semesterId: selectedSemester.id,
        courseCode: courseCode.trim().toUpperCase(),
        title: title.trim(),
        creditUnit: Number(creditUnit),
        note: note.trim() || undefined,
      });

      const typeMessages: Record<
        string,
        { msg: string; type: 'success' | 'info' | 'warning' }
      > = {
        CREATED: { msg: '🎉 Course submitted for review!', type: 'success' },
        SUPPORTED: { msg: result.message, type: 'info' },
        ALREADY_SUPPORTED: {
          msg: 'You already supported this submission.',
          type: 'warning',
        },
        ALREADY_EXISTS: {
          msg: 'This course already exists in the system!',
          type: 'info',
        },
      };

      const res = typeMessages[result.type] ?? {
        msg: result.message,
        type: 'success',
      };
      
      setSuccessModal({
        visible: true,
        title:
          result.type === 'CREATED'
            ? 'Request Submitted! 🚀'
            : 'Course Update',
        message: res.msg,
        courseCode: courseCode.trim().toUpperCase(),
        courseTitle: title.trim(),
      });
    } catch (err: any) {
      showMessage({
        message: 'Submission Failed',
        description: err?.message ?? 'Something went wrong.',
        type: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <LinearGradient
          colors={['#6B21A8', '#9333EA', '#C026D3', '#DB2777']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.orb1} />
          <View style={styles.orb2} />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/')
            }
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color='#0D0D0D' strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>SUBMIT COURSE</Text>
          </View>
          <Text style={styles.headline}>Request a course 📖</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Can't find your course? Submit it and moderators will review
            approved requests.
          </Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {isProfileIncomplete && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Complete your profile</Text>
              <Text style={styles.warningSubtitle}>
                Your university, faculty, department, and programme are taken
                from your profile. Update them there before submitting a course
                request.
              </Text>
              <TouchableOpacity
                style={styles.warningButton}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/profile',
                    params: { edit: 'true' },
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.warningButtonText}>Update Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 1: Level & Semester ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 1: Your Programme</Text>

            {profileLoading ? (
              <ActivityIndicator
                size='small'
                color='#7B2FBE'
                style={{ marginVertical: 16 }}
              />
            ) : (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Level</Text>
                  <SelectField
                    label={
                      selectedProgramme
                        ? 'Select level'
                        : 'Complete profile first'
                    }
                    value={selectedLevel?.label ?? null}
                    onPress={() => selectedProgramme && setOpenModal('level')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Semester</Text>
                  <SelectField
                    label={
                      selectedProgramme
                        ? 'Select semester'
                        : 'Complete profile first'
                    }
                    value={selectedSemester?.label ?? null}
                    onPress={() =>
                      selectedProgramme && setOpenModal('semester')
                    }
                  />
                </View>
              </View>
            )}
          </View>

          {/* ── Step 2: Course Details ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 2: Course Details</Text>

            <Text style={styles.label}>Course Code</Text>
            <View style={styles.inputWrapper}>
              <Hash size={18} color='#9ca3af' style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder='e.g. CSC301'
                placeholderTextColor='#9ca3af'
                value={courseCode}
                onChangeText={setCourseCode}
                autoCapitalize='characters'
                editable={!submitting}
                {...(Platform.OS === 'web'
                  ? ({ outlineStyle: 'none' } as any)
                  : {})}
              />
            </View>

            <Text style={styles.label}>Course Title</Text>
            <View style={styles.inputWrapper}>
              <BookOpen size={18} color='#9ca3af' style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder='e.g. Data Structures & Algorithms'
                placeholderTextColor='#9ca3af'
                value={title}
                onChangeText={setTitle}
                editable={!submitting}
                {...(Platform.OS === 'web'
                  ? ({ outlineStyle: 'none' } as any)
                  : {})}
              />
            </View>

            <Text style={styles.label}>Credit Units</Text>
            <View style={styles.inputWrapper}>
              <Layers size={18} color='#9ca3af' style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder='e.g. 3'
                placeholderTextColor='#9ca3af'
                value={creditUnit}
                onChangeText={setCreditUnit}
                keyboardType='numeric'
                editable={!submitting}
                {...(Platform.OS === 'web'
                  ? ({ outlineStyle: 'none' } as any)
                  : {})}
              />
            </View>

            <Text style={styles.label}>Additional Note (optional)</Text>
            <View
              style={[
                styles.inputWrapper,
                { alignItems: 'flex-start', paddingTop: 12 },
              ]}
            >
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                placeholder='Any additional info for moderators…'
                placeholderTextColor='#9ca3af'
                value={note}
                onChangeText={setNote}
                multiline
                editable={!submitting}
                {...(Platform.OS === 'web'
                  ? ({ outlineStyle: 'none' } as any)
                  : {})}
              />
            </View>
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#C4FF0E', '#A3E635']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color='#000' />
              ) : (
                <Text style={styles.submitButtonText}>Submit for Review 🚀</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <SelectModal
        visible={openModal === 'level'}
        title='Select Level'
        items={levels}
        loading={profileLoading}
        onSelect={i => {
          setSelectedLevel(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
      />
      <SelectModal
        visible={openModal === 'semester'}
        title='Select Semester'
        items={semesters}
        loading={profileLoading}
        onSelect={i => {
          setSelectedSemester(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
      />

      {/* Success Confirmation Modal */}
      {successModal && (
        <Modal
          visible={successModal.visible}
          transparent
          animationType='fade'
          onRequestClose={() => {
            setSuccessModal(null);
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/courses');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successIconBadge}>
                <Sparkles size={32} color='#0D0D0D' />
              </View>
              <Text style={styles.successModalTitle}>{successModal.title}</Text>
              <Text style={styles.successModalMessage}>{successModal.message}</Text>

              <View style={styles.successCourseChip}>
                <BookOpen size={16} color='#7B2FBE' />
                <Text style={styles.successCourseCode}>{successModal.courseCode}</Text>
                <Text style={styles.successCourseTitle} numberOfLines={1}>
                  {successModal.courseTitle}
                </Text>
              </View>

              <Text style={styles.successModalFootnote}>
                Our moderators review new course requests daily. You'll see it in the catalog once approved!
              </Text>

              <TouchableOpacity
                style={styles.successModalBtn}
                onPress={() => {
                  setSuccessModal(null);
                  if (router.canGoBack()) router.back();
                  else router.replace('/(tabs)/courses');
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#C4FF0E', '#A3E635']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.successModalBtnGradient}
                >
                  <Text style={styles.successModalBtnText}>Back to Courses 📚</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  header: {
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 2.5,
    borderBottomColor: '#000',
  },
  orb1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -20,
    right: -20,
  },
  orb2: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -8,
    right: 50,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#000',
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
    fontWeight: '500',
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 6,
  },
  warningSubtitle: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 12,
    fontWeight: '500',
  },
  warningButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#C4FF0E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  warningButtonText: { fontSize: 13, fontWeight: '800', color: '#000' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0D0D0D',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D0D0D',
    marginBottom: 8,
    marginTop: 12,
  },

  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  selectFieldText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
    flex: 1,
  },
  selectPlaceholder: { color: '#9ca3af', fontWeight: '500' },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  input: { flex: 1, fontSize: 14, color: '#0D0D0D', paddingVertical: 12, fontWeight: '600' },

  submitButton: {
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 15,
    borderRadius: 22,
    alignItems: 'center',
  },
  submitButtonText: { color: '#000', fontSize: 16, fontWeight: '900' },

  // ─── Success Confirmation Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C4FF0E',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D0D0D',
    textAlign: 'center',
    marginBottom: 6,
  },
  successModalMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  successCourseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#7B2FBE',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  successCourseCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7B2FBE',
  },
  successCourseTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  successModalFootnote: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successModalBtn: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  successModalBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  successModalBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
});
