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
import { HeroBanner } from '@/components/HeroBanner';
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
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { TabTransitionWrapper } from '@/components/TabTransitionWrapper';
import { showMessage } from 'react-native-flash-message';
import type { Course } from '@/types/course';
import {
  addCourseOnce,
  buildCourseFilters,
  filterCourseCatalog,
  removeCourseById,
} from '@/utils/courseBrowser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectItem {
  id: string;
  label: string;
  sublabel?: string;
}

type CourseView = 'selected' | 'browse';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Please try again.';

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
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, disabled && styles.filterChipDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.filterChipText} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={14} color='#1a1a2e' />
    </TouchableOpacity>
  );
}

function CourseCard({
  course,
  selected,
  pending,
  view,
  onOpen,
  onEnroll,
  onUnenroll,
}: {
  course: Course;
  selected: boolean;
  pending: boolean;
  view: CourseView;
  onOpen: () => void;
  onEnroll: () => void;
  onUnenroll: () => void;
}) {
  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={styles.courseCard}
        onPress={onOpen}
        activeOpacity={0.85}
      >
        <View style={styles.courseIconBox}>
          <Bookmark size={22} color='#4B1FA8' strokeWidth={2.5} />
        </View>
        <View style={styles.courseInfo}>
          <Text style={styles.courseCode}>{course.courseCode}</Text>
          <Text style={styles.courseName} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.unitLoad}>
            {course.creditUnit} unit{course.creditUnit !== 1 ? 's' : ''}
            {course.courseType ? ` · ${course.courseType}` : ''}
          </Text>
        </View>

        {view === 'browse' ? (
          <TouchableOpacity
            style={[
              styles.courseActionButton,
              selected && styles.courseActionSelected,
            ]}
            onPress={selected ? onUnenroll : onEnroll}
            disabled={pending}
            activeOpacity={0.7}
            accessibilityLabel={
              selected
                ? `Remove ${course.courseCode} from My Courses`
                : `Add ${course.courseCode} to My Courses`
            }
          >
            {pending ? (
              <ActivityIndicator size='small' color='#000' />
            ) : selected ? (
              <Check size={18} color='#000' strokeWidth={2.5} />
            ) : (
              <Plus size={18} color='#000' strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.arrowBtn}>
            <ChevronRight size={18} color='#000' strokeWidth={2.5} />
          </View>
        )}
      </TouchableOpacity>

      {view === 'selected' && (
        <TouchableOpacity
          style={styles.removeTextButton}
          onPress={onUnenroll}
          disabled={pending}
        >
          {pending ? (
            <ActivityIndicator size='small' color='#EF4444' />
          ) : (
            <Text style={styles.removeText}>Remove from my courses</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CoursesScreen() {
  const router = useRouter();
  const api = useApi();
  const clearance = useTabBarClearance(76); // Clearance for FAB
  const fabBottom = useTabBarClearance(16); // 16px above the tab bar
  // ── Memoize API clients so their identity is stable across renders ──
  const client = useMemo(() => coursesApi(api), [api]);
  const profileClient = useMemo(() => profileApi(api), [api]);

  const lastProfileRef = useRef<{
    university?: string | null;
    faculty?: string | null;
    department?: string | null;
    programme?: string | null;
    level?: number | null;
    semester?: string | null;
  } | null>(null);
  const isAutoSelectingRef = useRef(false);
  const isFetchingRef = useRef(false); // guard against concurrent auto-select calls
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

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
  const [activeView, setActiveView] = useState<CourseView>('selected');
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoading, setSelectedLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [pendingCourseIds, setPendingCourseIds] = useState<Set<string>>(
    () => new Set()
  );
  const pendingCourseIdsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const markCoursePending = (courseId: string, pending: boolean) => {
    const next = new Set(pendingCourseIdsRef.current);
    if (pending) {
      next.add(courseId);
    } else {
      next.delete(courseId);
    }
    pendingCourseIdsRef.current = next;
    setPendingCourseIds(next);
  };

  const loadSelectedCourses = useCallback(async () => {
    const response = await client.getSelected();
    const courses = response?.data ?? [];
    setSelectedCourses(courses);
    return courses;
  }, [client]);

  // ─── Fetch selected courses list ───────────────────────────
  const fetchSelectedCourses = useCallback(async () => {
    try {
      setSelectedLoading(true);
      setSelectedError(null);
      await loadSelectedCourses();
    } catch (error) {
      setSelectedError(errorMessage(error));
    } finally {
      setSelectedLoading(false);
    }
  }, [loadSelectedCourses]);

  // ─── Enroll / Unenroll handlers ─────────────────────────────
  const handleEnroll = async (course: Course) => {
    if (
      pendingCourseIdsRef.current.has(course.id) ||
      isCourseSelected(course.id)
    ) {
      return;
    }

    markCoursePending(course.id, true);
    setSelectedError(null);
    const optimisticCourse = { ...course, isEnrolled: true };
    setSelectedCourses(current => addCourseOnce(current, optimisticCourse));
    setCatalogCourses(current =>
      current.map(c => (c.id === course.id ? { ...c, isEnrolled: true } : c))
    );
    try {
      await client.enroll(course.id);
      showMessage({
        message: 'Course added to My Courses',
        type: 'success',
      });
      try {
        await loadSelectedCourses();
      } catch {
        setSelectedError('Course added, but the list could not be refreshed.');
      }
    } catch (error) {
      setSelectedCourses(current => removeCourseById(current, course.id));
      setCatalogCourses(current =>
        current.map(c => (c.id === course.id ? { ...c, isEnrolled: false } : c))
      );
      showMessage({
        message: 'Could not add course',
        description: errorMessage(error),
        type: 'danger',
      });
    } finally {
      markCoursePending(course.id, false);
    }
  };

  const handleUnenroll = async (course: Course) => {
    if (pendingCourseIdsRef.current.has(course.id)) {
      return;
    }

    markCoursePending(course.id, true);
    setSelectedError(null);
    setSelectedCourses(current => removeCourseById(current, course.id));
    setCatalogCourses(current =>
      current.map(c => (c.id === course.id ? { ...c, isEnrolled: false } : c))
    );
    try {
      await client.unenroll(course.id);
      showMessage({
        message: 'Course removed from selected list',
        type: 'info',
      });
      try {
        await loadSelectedCourses();
      } catch {
        setSelectedError(
          'Course removed, but the list could not be refreshed.'
        );
      }
    } catch (error) {
      setSelectedCourses(current => addCourseOnce(current, { ...course, isEnrolled: true }));
      setCatalogCourses(current =>
        current.map(c => (c.id === course.id ? { ...c, isEnrolled: true } : c))
      );
      showMessage({
        message: 'Failed to unselect course',
        description: errorMessage(error),
        type: 'danger',
      });
    } finally {
      markCoursePending(course.id, false);
    }
  };

  // ─── Pre-load student profile & resolve hierarchy ─────────
  const autoSelectProfile = useCallback(async () => {
    if (isFetchingRef.current) return; // prevent concurrent calls
    isFetchingRef.current = true;
    try {
      setHierarchyError(null);
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

      // Check if profile has changed from last time to avoid resetting manual overrides
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

      if (!uniName) {
        setIsProfileIncomplete(true);
        return;
      }

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

        if (!facName) {
          setIsProfileIncomplete(true);
          return;
        }

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

        if (!matchedDept || !matchedProg) {
          setIsProfileIncomplete(true);
          return;
        }

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

        if (
          matchedUni &&
          matchedFac &&
          matchedDept &&
          matchedProg &&
          matchedLvl &&
          matchedSem
        ) {
          setIsProfileIncomplete(false);
        } else {
          setIsProfileIncomplete(true);
        }
      } finally {
        isAutoSelectingRef.current = false;
      }
    } catch {
      setHierarchyError(
        'Unable to load your course filters. Please try again.'
      );
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [client, profileClient]);

  // Load universities list on mount
  useEffect(() => {
    setHierarchyError(null);
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
      .catch(() => setHierarchyError('Unable to load universities.'));
  }, [client]);

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
    setHierarchyError(null);
    client
      .getFaculties(selectedUniversity.id)
      .then(res => {
        setFaculties(
          (res?.data ?? []).map((f: any) => ({ id: f.id, label: f.name }))
        );
      })
      .catch(() => setHierarchyError('Unable to load faculties.'))
      .finally(() => setModalLoading(false));
  }, [client, selectedUniversity]);

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
    setHierarchyError(null);
    client
      .getDepartments(selectedFaculty.id)
      .then(res => {
        setDepartments(
          (res?.data ?? []).map((d: any) => ({ id: d.id, label: d.name }))
        );
      })
      .catch(() => setHierarchyError('Unable to load departments.'))
      .finally(() => setModalLoading(false));
  }, [client, selectedFaculty]);

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
    setHierarchyError(null);
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
      .catch(() => setHierarchyError('Unable to load programmes.'))
      .finally(() => setModalLoading(false));
  }, [client, selectedDepartment]);

  useEffect(() => {
    if (!selectedProgramme) return;
    if (isAutoSelectingRef.current) return; // Skip during auto-select
    setLevels([]);
    setSemesters([]);
    setSelectedLevel(null);
    setSelectedSemester(null);
    setModalLoading(true);
    setHierarchyError(null);
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
      .catch(() => setHierarchyError('Unable to load levels and semesters.'))
      .finally(() => setModalLoading(false));
  }, [client, selectedProgramme]);

  const catalogFilters = useMemo(
    () =>
      buildCourseFilters({
        universityId: selectedUniversity?.id,
        facultyId: selectedFaculty?.id,
        departmentId: selectedDepartment?.id,
        programmeId: selectedProgramme?.id,
        levelId: selectedLevel?.id,
        semesterId: selectedSemester?.id,
      }),
    [
      selectedUniversity?.id,
      selectedFaculty?.id,
      selectedDepartment?.id,
      selectedProgramme?.id,
      selectedLevel?.id,
      selectedSemester?.id,
    ]
  );
  const catalogRequestRef = useRef(0);

  const fetchCatalogCourses = useCallback(async () => {
    const requestId = ++catalogRequestRef.current;
    if (!catalogFilters) {
      setCatalogCourses([]);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }

    try {
      setCatalogLoading(true);
      setCatalogError(null);
      const response = await client.getAll(catalogFilters);
      if (requestId === catalogRequestRef.current) {
        setCatalogCourses(response?.data ?? []);
      }
    } catch (error) {
      if (requestId === catalogRequestRef.current) {
        setCatalogError(errorMessage(error));
        setCatalogCourses([]);
      }
    } finally {
      if (requestId === catalogRequestRef.current) {
        setCatalogLoading(false);
      }
    }
  }, [catalogFilters, client]);

  useEffect(() => {
    if (activeView === 'browse') {
      void fetchCatalogCourses();
    }
  }, [activeView, fetchCatalogCourses]);

  const visibleCatalogCourses = useMemo(
    () => filterCourseCatalog(catalogCourses, searchQuery),
    [catalogCourses, searchQuery]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeView === 'browse') {
        await Promise.all([fetchSelectedCourses(), fetchCatalogCourses()]);
      } else {
        await fetchSelectedCourses();
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeView, fetchCatalogCourses, fetchSelectedCourses]);

  const handleCoursePress = (courseId: string) =>
    router.push({ pathname: '/course-detail', params: { courseId } });

  // ─── Selected Check Helper ───
  const isCourseSelected = (courseId: string) =>
    selectedCourses.some(sc => sc.id === courseId);

  const totalUnits = selectedCourses.reduce(
    (t, c) => t + (c.creditUnit ?? 0),
    0
  );
  const browseError = hierarchyError || catalogError;
  const activeLoading =
    loading || (activeView === 'selected' ? selectedLoading : catalogLoading);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <TabTransitionWrapper>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor='#7B2FBE'
            />
          }
        >
          {/* ─── Hero Banner ─── */}
          <HeroBanner
            badgeText="COURSE BROWSER"
            title={'Courses &\nCatalog 📚'}
            subtitle="Keep your enrolled courses close and discover what comes next."
          />

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeView === 'selected' && styles.activeTabButton,
              ]}
              onPress={() => setActiveView('selected')}
            >
              <Bookmark size={16} color='#000' />
              <Text
                style={[
                  styles.tabButtonText,
                  activeView === 'selected' && styles.activeTabButtonText,
                ]}
              >
                My Courses
              </Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>
                  {selectedCourses.length}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeView === 'browse' && styles.activeTabButton,
              ]}
              onPress={() => setActiveView('browse')}
            >
              <Search size={16} color='#000' />
              <Text
                style={[
                  styles.tabButtonText,
                  activeView === 'browse' && styles.activeTabButtonText,
                ]}
              >
                Browse
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Profile Incomplete Warning Banner ─── */}
          {isProfileIncomplete && (
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Text style={styles.warningTitle}>
                  ⚠️ Complete Your Profile
                </Text>
              </View>
              <Text style={styles.warningSubtitle}>
                Set your university, faculty, department, programme, level, and
                semester in your profile to automatically find your courses.
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
                <Text style={styles.warningButtonText}>
                  Update Profile Details
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {activeView === 'browse' && !isProfileIncomplete && (
            <>
              <View style={styles.searchWrapper}>
                <Search size={18} color='#666' />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder='Search by code, title, or type'
                  placeholderTextColor='#888'
                  autoCapitalize='none'
                  {...(Platform.OS === 'web'
                    ? ({ outlineStyle: 'none' } as any)
                    : {})}
                />
                {!!searchQuery && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={17} color='#555' />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
              >
                <FilterChip
                  label={selectedUniversity?.label || 'University'}
                  onPress={() => setOpenModal('university')}
                />
                <FilterChip
                  label={selectedFaculty?.label || 'Faculty'}
                  onPress={() => setOpenModal('faculty')}
                  disabled={!selectedUniversity}
                />
                <FilterChip
                  label={selectedDepartment?.label || 'Department'}
                  onPress={() => setOpenModal('department')}
                  disabled={!selectedFaculty}
                />
                <FilterChip
                  label={selectedProgramme?.label || 'Programme'}
                  onPress={() => setOpenModal('programme')}
                  disabled={!selectedDepartment}
                />
                <FilterChip
                  label={selectedLevel?.label || 'Level'}
                  onPress={() => setOpenModal('level')}
                  disabled={!selectedProgramme}
                />
                <FilterChip
                  label={selectedSemester?.label || 'Semester'}
                  onPress={() => setOpenModal('semester')}
                  disabled={!selectedProgramme}
                />
              </ScrollView>
            </>
          )}

          {/* ─── Stats row ─── */}
          {activeView === 'selected' && selectedCourses.length > 0 && (
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

          {(selectedError && activeView === 'selected') ||
          (browseError && activeView === 'browse') ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {activeView === 'selected' ? selectedError : browseError}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  if (activeView === 'selected') {
                    void fetchSelectedCourses();
                  } else if (hierarchyError) {
                    lastProfileRef.current = null;
                    void autoSelectProfile();
                  } else {
                    void fetchCatalogCourses();
                  }
                }}
              >
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {activeLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size='large' color='#7B2FBE' />
              <Text style={styles.loadingText}>
                {activeView === 'browse'
                  ? 'Loading course catalog…'
                  : 'Loading your courses…'}
              </Text>
            </View>
          )}

          {!activeLoading &&
            activeView === 'selected' &&
            selectedCourses.length === 0 &&
            !selectedError && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📥</Text>
                <Text style={styles.emptyTitle}>No courses yet</Text>
                <Text style={styles.emptySubtitle}>
                  Browse the catalog to find courses for your programme, level,
                  and semester.
                </Text>
                <TouchableOpacity
                  style={styles.requestButtonInline}
                  onPress={() => setActiveView('browse')}
                >
                  <Text style={styles.requestButtonInlineText}>
                    Browse courses
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {!activeLoading &&
            activeView === 'browse' &&
            !catalogLoading &&
            !browseError &&
            !isProfileIncomplete &&
            visibleCatalogCourses.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🔎</Text>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matching courses' : 'No courses found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try a different course code or title.'
                    : 'There are no courses for these filters yet. You can submit a course request below.'}
                </Text>
              </View>
            )}

          {!activeLoading &&
            (activeView === 'selected'
              ? selectedCourses
              : isProfileIncomplete || browseError
              ? []
              : visibleCatalogCourses
            ).map(course => (
              <CourseCard
                key={course.id}
                course={course}
                selected={isCourseSelected(course.id)}
                pending={pendingCourseIds.has(course.id)}
                view={activeView}
                onOpen={() => handleCoursePress(course.id)}
                onEnroll={() => handleEnroll(course)}
                onUnenroll={() => handleUnenroll(course)}
              />
            ))}

          {/* ─── Request footer card ─── */}
          {(activeView === 'browse' || selectedCourses.length > 0) && (
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

          <View style={{ height: clearance }} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={() => {
            if (activeView === 'selected') {
              setActiveView('browse');
            } else {
              router.push('/submit-course');
            }
          }}
          activeOpacity={0.8}
          accessibilityLabel={
            activeView === 'selected'
              ? 'Browse course catalog'
              : 'Submit a new course request'
          }
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
    </TabTransitionWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

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
    gap: 6,
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

  filtersRow: { gap: 8, paddingRight: 6, paddingBottom: 14 },
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
  filterChipDisabled: { opacity: 0.45 },

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
  courseIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
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
  courseActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6BCB77',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  courseActionSelected: { backgroundColor: '#C4FF0E' },

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
