import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Search,
  Plus,
  X,
  ChevronDown,
  Check,
  Bookmark,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi, coursesApi, profileApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Svg, { Circle } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  courseCode: string;
  title: string;
  creditUnit: number;
  courseType: string;
  semester?: { name: string };
  level?: { level: number };
  programme?: { name: string };
}

interface SelectItem {
  id: string;
  label: string;
  sublabel?: string;
}

// ─── Progress donut colours (cycles through) ──────────────────────────────────
const DONUT_CONFIGS = [
  { fg: '#C4FF0E', bg: '#2A2A3E' },
  { fg: '#FF6B9D', bg: '#2A2A3E' },
  { fg: '#4D96FF', bg: '#2A2A3E' },
  { fg: '#FFD93D', bg: '#2A2A3E' },
  { fg: '#6BCB77', bg: '#2A2A3E' },
];

// ─── Circular Progress Donut ──────────────────────────────────────────────────
function ProgressDonut({
  percent,
  fgColor,
  bgColor,
}: {
  percent: number;
  fgColor: string;
  bgColor: string;
}) {
  const SIZE = 60,
    STROKE = 6,
    R = (SIZE - STROKE) / 2,
    CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - percent / 100);
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        stroke={bgColor}
        strokeWidth={STROKE}
        fill='transparent'
      />
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        stroke={fgColor}
        strokeWidth={STROKE}
        fill='transparent'
        strokeDasharray={`${CIRC}`}
        strokeDashoffset={offset}
        strokeLinecap='round'
        rotation='-90'
        origin={`${SIZE / 2}, ${SIZE / 2}`}
      />
    </Svg>
  );
}

// ─── Reusable Select Picker Modal ─────────────────────────────────────────────
function SelectModal({
  visible,
  title,
  items,
  onSelect,
  onClose,
  loading,
  placeholder = 'Search…',
}: {
  visible: boolean;
  title: string;
  items: SelectItem[];
  onSelect: (item: SelectItem) => void;
  onClose: () => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
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
              placeholder={placeholder}
              value={query}
              onChangeText={setQuery}
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
                    setQuery('');
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

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.filterChip}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.filterChipText} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={14} color='#1a1a2e' />
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CoursesScreen() {
  const router = useRouter();
  const api = useApi();
  // ── Memoize API clients so their identity is stable across renders ──
  const client = useMemo(() => coursesApi(api), [api]);
  const profileClient = useMemo(() => profileApi(api), [api]);

  const lastProfileRef = useRef<{
    university?: string | null;
    faculty?: string | null;
    department?: string | null;
    level?: number;
    semester?: string | null;
  } | null>(null);
  const isAutoSelectingRef = useRef(false);
  const isFetchingRef = useRef(false); // guard against concurrent auto-select calls
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [autoSelectDone, setAutoSelectDone] = useState(0);

  // ── Filter hierarchy state ──
  const [universities, setUniversities] = useState<SelectItem[]>([]);
  const [faculties, setFaculties] = useState<SelectItem[]>([]);
  const [departments, setDepartments] = useState<SelectItem[]>([]);
  const [programmes, setProgrammes] = useState<SelectItem[]>([]);
  const [levels, setLevels] = useState<SelectItem[]>([]);
  const [semesters, setSemesters] = useState<SelectItem[]>([]);

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
  const [selectedLevel, setSelectedLevel] = useState<SelectItem | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<SelectItem | null>(
    null
  );

  const [openModal, setOpenModal] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Courses state ──
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Fetch selected courses list ───────────────────────────
  const fetchSelectedCourses = useCallback(async () => {
    try {
      const res = await client.getSelected();
      setSelectedCourses(res?.data ?? []);
    } catch (err) {
      console.warn('Failed to load selected courses:', err);
    }
  }, [client]);

  // ─── Enroll / Unenroll handlers ─────────────────────────────
  const handleEnroll = async (courseId: string) => {
    try {
      await client.enroll(courseId);
      showMessage({
        message: 'Course added to selected list!',
        type: 'success',
      });
      fetchSelectedCourses();
    } catch (err: any) {
      showMessage({
        message: 'Failed to select course',
        description: err?.message,
        type: 'danger',
      });
    }
  };

  const handleUnenroll = async (courseId: string) => {
    try {
      await client.unenroll(courseId);
      showMessage({
        message: 'Course removed from selected list',
        type: 'info',
      });
      fetchSelectedCourses();
    } catch (err: any) {
      showMessage({
        message: 'Failed to unselect course',
        description: err?.message,
        type: 'danger',
      });
    }
  };

  // ─── Pre-load student profile & resolve hierarchy ─────────
  const autoSelectProfile = useCallback(async () => {
    if (isFetchingRef.current) return; // prevent concurrent calls
    isFetchingRef.current = true;
    try {
      const isFirstLoad = !lastProfileRef.current;
      if (isFirstLoad) {
        setLoading(true);
      }
      const [uniRes, profileRes] = await Promise.all([
        client.getUniversities(),
        profileClient.getProfile(),
      ]);

      const rawUnis = uniRes?.data ?? [];
      const userProfile = profileRes?.data;
      if (!userProfile) return;

      const uniName = userProfile.university?.trim();
      const facName = userProfile.faculty?.trim();
      const deptName = userProfile.department?.trim();

      const incomplete = !uniName || !facName || !deptName;
      setIsProfileIncomplete(incomplete);

      // Check if profile has changed from last time to avoid resetting manual overrides
      const lp = lastProfileRef.current;
      const profileChanged =
        !lp ||
        lp.university !== userProfile.university ||
        lp.faculty !== userProfile.faculty ||
        lp.department !== userProfile.department ||
        lp.level !== userProfile.level ||
        lp.semester !== userProfile.semester;

      if (!profileChanged) {
        return;
      }

      lastProfileRef.current = {
        university: userProfile.university,
        faculty: userProfile.faculty,
        department: userProfile.department,
        level: userProfile.level,
        semester: userProfile.semester,
      };

      if (!uniName) return;

      const matchedUni = rawUnis.find(
        (u: any) =>
          u.name.toLowerCase().includes(uniName.toLowerCase()) ||
          uniName.toLowerCase().includes(u.name.toLowerCase()) ||
          u.shortName.toLowerCase().includes(uniName.toLowerCase()) ||
          uniName.toLowerCase().includes(u.shortName.toLowerCase())
      );
      if (!matchedUni) return;

      // ── All sequential selects are programmatic; block cascade resets ──
      isAutoSelectingRef.current = true;
      try {
        const uniItem = {
          id: matchedUni.id,
          label: matchedUni.name,
          sublabel: `${matchedUni.shortName} · ${matchedUni.state}`,
        };
        setSelectedUniversity(uniItem);

        // Faculties
        const facsRes = await client.getFaculties(matchedUni.id);
        const rawFacs = facsRes?.data ?? [];
        setFaculties(rawFacs.map((f: any) => ({ id: f.id, label: f.name })));

        if (!facName) return;

        const matchedFac = rawFacs.find(
          (f: any) =>
            f.name.toLowerCase().includes(facName.toLowerCase()) ||
            facName.toLowerCase().includes(f.name.toLowerCase())
        );
        if (!matchedFac) return;

        setSelectedFaculty({ id: matchedFac.id, label: matchedFac.name });

        // Departments
        const deptsRes = await client.getDepartments(matchedFac.id);
        const rawDepts = deptsRes?.data ?? [];
        setDepartments(rawDepts.map((d: any) => ({ id: d.id, label: d.name })));

        let matchedDept = rawDepts.find(
          (d: any) =>
            d.name.toLowerCase().includes(deptName.toLowerCase()) ||
            deptName.toLowerCase().includes(d.name.toLowerCase())
        );
        let matchedProg = null;

        if (matchedDept) {
          setSelectedDepartment({
            id: matchedDept.id,
            label: matchedDept.name,
          });
          const progsRes = await client.getProgrammes(matchedDept.id);
          const rawProgs = progsRes?.data ?? [];
          setProgrammes(
            rawProgs.map((p: any) => ({
              id: p.id,
              label: p.name,
              sublabel: p.degreeType,
            }))
          );
          matchedProg =
            rawProgs.find(
              (p: any) =>
                p.name.toLowerCase().includes(deptName.toLowerCase()) ||
                deptName.toLowerCase().includes(p.name.toLowerCase())
            ) || rawProgs[0];
        } else {
          // Try searching for a programme match across all departments in this faculty
          for (const dept of rawDepts) {
            const progsRes = await client.getProgrammes(dept.id);
            const rawProgs = progsRes?.data ?? [];
            const foundProg = rawProgs.find(
              (p: any) =>
                p.name.toLowerCase().includes(deptName.toLowerCase()) ||
                deptName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (foundProg) {
              matchedDept = dept;
              matchedProg = foundProg;
              // Populate programmes list from this department
              setProgrammes(
                rawProgs.map((p: any) => ({
                  id: p.id,
                  label: p.name,
                  sublabel: p.degreeType,
                }))
              );
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

        if (!matchedDept || !matchedProg) return;

        setSelectedProgramme({
          id: matchedProg.id,
          label: matchedProg.name,
          sublabel: matchedProg.degreeType,
        });

        // Levels & Semesters
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

        const matchedSem = rawSems.find((s: any) =>
          s.name
            .toLowerCase()
            .includes(userProfile.semester?.toLowerCase() || '')
        );
        if (matchedSem) {
          setSelectedSemester({ id: matchedSem.id, label: matchedSem.name });
        }
      } finally {
        isAutoSelectingRef.current = false;
        setAutoSelectDone(prev => prev + 1); // signal that auto-select is done
      }
    } catch (err) {
      console.warn('Auto profile pre-selection failed:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [client, profileClient]);

  // Load universities list on mount
  useEffect(() => {
    client
      .getUniversities()
      .then(res => {
        setUniversities(
          (res?.data ?? []).map((u: any) => ({
            id: u.id,
            label: u.name,
            sublabel: `${u.shortName} · ${u.state}`,
          }))
        );
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      autoSelectProfile();
      fetchSelectedCourses();
    }, [autoSelectProfile, fetchSelectedCourses])
  );

  // ─── Load faculties when university changes (skip during auto-select) ──────
  useEffect(() => {
    if (!selectedUniversity) return;
    if (isAutoSelectingRef.current) return; // Don't cascade-reset during auto-select
    setFaculties([]);
    setDepartments([]);
    setProgrammes([]);
    setLevels([]);
    setSemesters([]);
    setSelectedFaculty(null);
    setSelectedDepartment(null);
    setSelectedProgramme(null);
    setSelectedLevel(null);
    setSelectedSemester(null);
    setModalLoading(true);
    client
      .getFaculties(selectedUniversity.id)
      .then(res => {
        setFaculties(
          (res?.data ?? []).map((f: any) => ({ id: f.id, label: f.name }))
        );
      })
      .catch(() => {})
      .finally(() => setModalLoading(false));
  }, [selectedUniversity]);

  useEffect(() => {
    if (!selectedFaculty) return;
    if (isAutoSelectingRef.current) return; // Skip during auto-select
    setDepartments([]);
    setProgrammes([]);
    setLevels([]);
    setSemesters([]);
    setSelectedDepartment(null);
    setSelectedProgramme(null);
    setSelectedLevel(null);
    setSelectedSemester(null);
    setModalLoading(true);
    client
      .getDepartments(selectedFaculty.id)
      .then(res => {
        setDepartments(
          (res?.data ?? []).map((d: any) => ({ id: d.id, label: d.name }))
        );
      })
      .catch(() => {})
      .finally(() => setModalLoading(false));
  }, [selectedFaculty]);

  useEffect(() => {
    if (!selectedDepartment) return;
    if (isAutoSelectingRef.current) return; // Skip during auto-select
    setProgrammes([]);
    setLevels([]);
    setSemesters([]);
    setSelectedProgramme(null);
    setSelectedLevel(null);
    setSelectedSemester(null);
    setModalLoading(true);
    client
      .getProgrammes(selectedDepartment.id)
      .then(res => {
        setProgrammes(
          (res?.data ?? []).map((p: any) => ({
            id: p.id,
            label: p.name,
            sublabel: p.degreeType,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setModalLoading(false));
  }, [selectedDepartment]);

  useEffect(() => {
    if (!selectedProgramme) return;
    if (isAutoSelectingRef.current) return; // Skip during auto-select
    setLevels([]);
    setSemesters([]);
    setSelectedLevel(null);
    setSelectedSemester(null);
    setModalLoading(true);
    Promise.all([
      client.getLevels(selectedProgramme.id),
      client.getSemesters(selectedProgramme.id),
    ])
      .then(([lvlRes, semRes]) => {
        setLevels(
          (lvlRes?.data ?? []).map((l: any) => ({
            id: l.id,
            label: `Level ${l.level}`,
          }))
        );
        setSemesters(
          (semRes?.data ?? []).map((s: any) => ({ id: s.id, label: s.name }))
        );
      })
      .catch(() => {})
      .finally(() => setModalLoading(false));
  }, [selectedProgramme]);

  const handleCoursePress = (courseId: string) =>
    router.push({ pathname: '/course-detail', params: { courseId } });

  // ─── Selected Check Helper ───
  const isCourseSelected = (courseId: string) =>
    selectedCourses.some(sc => sc.id === courseId);

  const totalUnits = selectedCourses.reduce(
    (t, c) => t + (c.creditUnit ?? 0),
    0
  );

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchSelectedCourses();
              setRefreshing(false);
            }}
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
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>COURSE BROWSER</Text>
            </View>
            <Text style={styles.heroHeading}>My Courses 📚</Text>
            <Text style={styles.heroSubtitle}>
              Browse and select courses for your department and semester.
            </Text>
          </LinearGradient>
        </View>

        {/* ─── Profile Incomplete Warning Banner ─── */}
        {isProfileIncomplete && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningTitle}>⚠️ Complete Your Profile</Text>
            </View>
            <Text style={styles.warningSubtitle}>
              Please set your University, Faculty, and Department in your
              profile to automatically see and select your courses.
            </Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() =>
                router.push({ pathname: '/profile', params: { edit: 'true' } })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.warningButtonText}>
                Update Profile Details
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Stats row ─── */}
        {selectedCourses.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{selectedCourses.length}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{totalUnits}</Text>
              <Text style={styles.statLabel}>Total units</Text>
            </View>
          </View>
        )}

        {/* ─── Loading ─── */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size='large' color='#7B2FBE' />
            <Text style={styles.loadingText}>Loading courses…</Text>
          </View>
        )}

        {/* ─── Empty State ─── */}
        {!loading && selectedCourses.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📥</Text>
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the <Text style={{ fontWeight: '700' }}>+</Text> button to
              browse and add courses to your dashboard.
            </Text>
          </View>
        )}

        {/* ─── Course Cards ─── */}
        {!loading &&
          selectedCourses.map((course, index) => {
            const config = DONUT_CONFIGS[index % DONUT_CONFIGS.length];
            const progress =
              ((course.courseCode?.charCodeAt(course.courseCode.length - 1) %
                6) +
                1) *
              12;
            const selected = isCourseSelected(course.id);

            return (
              <View key={course.id} style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.courseCard}
                  onPress={() => handleCoursePress(course.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.donutContainer}>
                    <ProgressDonut
                      percent={progress}
                      fgColor={config.fg}
                      bgColor={config.bg}
                    />
                    <Text style={styles.donutLabel}>{progress}%</Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseCode}>{course.courseCode}</Text>
                    <Text style={styles.courseName} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <Text style={styles.unitLoad}>
                      {course.creditUnit} unit
                      {course.creditUnit !== 1 ? 's' : ''}
                    </Text>
                    <View style={styles.tutorBadge}>
                      <View style={styles.tutorDot} />
                      <Text style={styles.tutorBadgeText}>Tutor ready</Text>
                    </View>
                  </View>

                  {/* Selection Action Button */}
                  {selected ? (
                    <TouchableOpacity
                      style={styles.arrowBtn}
                      onPress={() => handleCoursePress(course.id)}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={18} color='#000' strokeWidth={2.5} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.plusBtn}
                      onPress={() => handleEnroll(course.id)}
                      activeOpacity={0.7}
                    >
                      <Plus size={18} color='#000' strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Remove course button */}
                <TouchableOpacity
                  style={styles.removeTextButton}
                  onPress={() => handleUnenroll(course.id)}
                >
                  <Text style={styles.removeText}>Remove from my courses</Text>
                </TouchableOpacity>
              </View>
            );
          })}

        {/* ─── Request footer card ─── */}
        {selectedCourses.length > 0 && (
          <TouchableOpacity
            style={styles.requestFooterCard}
            onPress={() => router.push('/submit-course')}
            activeOpacity={0.8}
          >
            <Text style={styles.requestFooterText}>
              Can't find a course?{' '}
              <Text style={styles.requestFooterLinkText}>Submit it 🚀</Text>
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── FAB: Submit Course ─── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/submit-course')}
        activeOpacity={0.8}
      >
        <Plus size={24} color='#000' strokeWidth={2.5} />
      </TouchableOpacity>

      {/* ─── Select Modals ─── */}
      <SelectModal
        visible={openModal === 'university'}
        title='Select University'
        items={universities}
        onSelect={i => {
          setSelectedUniversity(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        loading={false}
      />
      <SelectModal
        visible={openModal === 'faculty'}
        title='Select Faculty'
        items={faculties}
        onSelect={i => {
          setSelectedFaculty(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        loading={modalLoading}
      />
      <SelectModal
        visible={openModal === 'department'}
        title='Select Department'
        items={departments}
        onSelect={i => {
          setSelectedDepartment(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        loading={modalLoading}
      />
      <SelectModal
        visible={openModal === 'programme'}
        title='Select Programme'
        items={programmes}
        onSelect={i => {
          setSelectedProgramme(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        loading={modalLoading}
      />
      <SelectModal
        visible={openModal === 'level'}
        title='Select Level'
        items={levels}
        onSelect={i => {
          setSelectedLevel(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        loading={modalLoading}
      />
      <SelectModal
        visible={openModal === 'semester'}
        title='Select Semester'
        items={semesters}
        onSelect={i => {
          setSelectedSemester(i);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
        loading={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  heroBannerWrapper: {
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    marginBottom: 16,
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
  seasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#000',
    marginBottom: 14,
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.8,
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 38,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 19,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  tabButtonText: { fontSize: 13, fontWeight: '700', color: '#666' },
  activeTabButtonText: { color: '#000' },
  badgeCount: {
    backgroundColor: '#C4FF0E',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  badgeCountText: { fontSize: 10, fontWeight: '800' },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a2e' },

  filtersRow: { marginBottom: 14 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    maxWidth: 180,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    flexShrink: 1,
  },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statChip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: '#7B2FBE' },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#666', marginTop: 2 },

  loadingBox: { alignItems: 'center', marginTop: 40, gap: 12 },
  loadingText: { fontSize: 14, color: '#7B2FBE', fontWeight: '700' },

  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F43F5E',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#F43F5E',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#F43F5E',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '800' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#000',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  requestButtonInline: {
    backgroundColor: '#C4FF0E',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginTop: 8,
  },
  requestButtonInlineText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },

  cardWrapper: { marginBottom: 12 },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#000',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    gap: 14,
  },
  donutContainer: { alignItems: 'center', justifyContent: 'center', width: 60 },
  donutLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  courseInfo: { flex: 1 },
  courseCode: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7B2FBE',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    lineHeight: 20,
    marginBottom: 4,
  },
  unitLoad: { fontSize: 12, fontWeight: '700', color: '#666' },
  tutorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  tutorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  tutorBadgeText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6BCB77',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },

  removeTextButton: { alignSelf: 'flex-end', marginTop: 4, marginRight: 4 },
  removeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    textDecorationLine: 'underline',
  },

  requestFooterCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#7B2FBE',
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  requestFooterText: { fontSize: 14, color: '#4B1FA8', fontWeight: '600' },
  requestFooterLinkText: { fontWeight: '900', color: '#7B2FBE' },

  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },

  warningCard: {
    backgroundColor: '#FFEAEA',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#000',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  warningSubtitle: {
    fontSize: 13,
    color: '#333',
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '600',
  },
  warningButton: {
    backgroundColor: '#C4FF0E',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#000',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  warningButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },
});
