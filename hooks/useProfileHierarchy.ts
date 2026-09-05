import { useCallback, useState } from 'react';
import type {
  DepartmentHierarchyItem,
  FacultyHierarchyItem,
  LevelHierarchyItem,
  ProgrammeHierarchyItem,
  SemesterHierarchyItem,
  UniversityHierarchyItem,
  UserProfile,
} from '@/utils/types';

type DataResponse<T> = Promise<{ data: T[] }>;

export type ProfileHierarchyClient = {
  getUniversities: () => DataResponse<UniversityHierarchyItem>;
  getFaculties: (universityId: string) => DataResponse<FacultyHierarchyItem>;
  getDepartments: (facultyId: string) => DataResponse<DepartmentHierarchyItem>;
  getProgrammes: (departmentId: string) => DataResponse<ProgrammeHierarchyItem>;
  getLevels: (programmeId: string) => DataResponse<LevelHierarchyItem>;
  getSemesters: (programmeId: string) => DataResponse<SemesterHierarchyItem>;
};

export type ProfileHierarchySelection = {
  university: UniversityHierarchyItem | null;
  faculty: FacultyHierarchyItem | null;
  department: DepartmentHierarchyItem | null;
  programme: ProgrammeHierarchyItem | null;
  level: LevelHierarchyItem | null;
  semester: SemesterHierarchyItem | null;
};

const EMPTY_SELECTION: ProfileHierarchySelection = {
  university: null,
  faculty: null,
  department: null,
  programme: null,
  level: null,
  semester: null,
};

const normalize = (value: string): string => value.trim().toLowerCase();

export const findHierarchyItem = <
  T extends { name: string; shortName?: string }
>(
  items: T[],
  savedName?: string | null
): T | null => {
  if (!savedName) {
    return null;
  }

  const target = normalize(savedName);
  if (!target) {
    return null;
  }
  return (
    items.find(
      item =>
        normalize(item.name) === target ||
        (item.shortName && normalize(item.shortName) === target)
    ) ??
    items.find(item => {
      const name = normalize(item.name);
      const shortName = item.shortName ? normalize(item.shortName) : '';
      return (
        name.includes(target) ||
        target.includes(name) ||
        (shortName &&
          (shortName.includes(target) || target.includes(shortName)))
      );
    }) ??
    null
  );
};

export const normalizeSemester = (
  value?: string | null
): 'First' | 'Second' | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized.includes('first') ||
    normalized === '1' ||
    normalized.startsWith('1st')
  ) {
    return 'First';
  }
  if (
    normalized.includes('second') ||
    normalized === '2' ||
    normalized.startsWith('2nd')
  ) {
    return 'Second';
  }
  return null;
};

export const useProfileHierarchy = (client: ProfileHierarchyClient) => {
  const [universities, setUniversities] = useState<UniversityHierarchyItem[]>(
    []
  );
  const [faculties, setFaculties] = useState<FacultyHierarchyItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentHierarchyItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeHierarchyItem[]>([]);
  const [levels, setLevels] = useState<LevelHierarchyItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterHierarchyItem[]>([]);
  const [selection, setSelection] =
    useState<ProfileHierarchySelection>(EMPTY_SELECTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetOptionsBelow = useCallback(
    (field: keyof ProfileHierarchySelection) => {
      if (field === 'university') {
        setFaculties([]);
      }
      if (field === 'university' || field === 'faculty') {
        setDepartments([]);
      }
      if (['university', 'faculty', 'department'].includes(field)) {
        setProgrammes([]);
      }
      if (
        ['university', 'faculty', 'department', 'programme'].includes(field)
      ) {
        setLevels([]);
        setSemesters([]);
      }
    },
    []
  );

  const loadProgrammeOptions = useCallback(
    async (programme: ProgrammeHierarchyItem) => {
      const [levelResponse, semesterResponse] = await Promise.all([
        client.getLevels(programme.id),
        client.getSemesters(programme.id),
      ]);
      setLevels(levelResponse.data ?? []);
      setSemesters(semesterResponse.data ?? []);
      return {
        levels: levelResponse.data ?? [],
        semesters: semesterResponse.data ?? [],
      };
    },
    [client]
  );

  const hydrate = useCallback(
    async (profile: UserProfile) => {
      setLoading(true);
      setError(null);
      setSelection(EMPTY_SELECTION);
      setFaculties([]);
      setDepartments([]);
      setProgrammes([]);
      setLevels([]);
      setSemesters([]);

      try {
        const universityItems = (await client.getUniversities()).data ?? [];
        setUniversities(universityItems);
        const university = findHierarchyItem(
          universityItems,
          profile.university
        );
        if (!university) {
          return;
        }

        const facultyItems =
          (await client.getFaculties(university.id)).data ?? [];
        setFaculties(facultyItems);
        const faculty = findHierarchyItem(facultyItems, profile.faculty);
        if (!faculty) {
          setSelection({ ...EMPTY_SELECTION, university });
          return;
        }

        const departmentItems =
          (await client.getDepartments(faculty.id)).data ?? [];
        setDepartments(departmentItems);
        const department = findHierarchyItem(
          departmentItems,
          profile.department
        );
        if (!department) {
          setSelection({ ...EMPTY_SELECTION, university, faculty });
          return;
        }

        const programmeItems =
          (await client.getProgrammes(department.id)).data ?? [];
        setProgrammes(programmeItems);
        const programme = findHierarchyItem(programmeItems, profile.programme);
        if (!programme) {
          setSelection({ ...EMPTY_SELECTION, university, faculty, department });
          return;
        }

        const programmeOptions = await loadProgrammeOptions(programme);
        const level =
          programmeOptions.levels.find(
            item => item.level === Number(profile.level)
          ) ?? null;
        const savedSemester = normalizeSemester(profile.semester);
        const semester =
          programmeOptions.semesters.find(
            item => normalizeSemester(item.name) === savedSemester
          ) ?? null;

        setSelection({
          university,
          faculty,
          department,
          programme,
          level,
          semester,
        });
      } catch {
        setError('Unable to load academic options. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [client, loadProgrammeOptions]
  );

  const selectUniversity = useCallback(
    async (university: UniversityHierarchyItem) => {
      setLoading(true);
      setError(null);
      resetOptionsBelow('university');
      setSelection({ ...EMPTY_SELECTION, university });
      try {
        const response = await client.getFaculties(university.id);
        setFaculties(response.data ?? []);
      } catch {
        setError('Unable to load faculties. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [client, resetOptionsBelow]
  );

  const selectFaculty = useCallback(
    async (faculty: FacultyHierarchyItem) => {
      setLoading(true);
      setError(null);
      resetOptionsBelow('faculty');
      setSelection(current => ({
        ...EMPTY_SELECTION,
        university: current.university,
        faculty,
      }));
      try {
        const response = await client.getDepartments(faculty.id);
        setDepartments(response.data ?? []);
      } catch {
        setError('Unable to load departments. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [client, resetOptionsBelow]
  );

  const selectDepartment = useCallback(
    async (department: DepartmentHierarchyItem) => {
      setLoading(true);
      setError(null);
      resetOptionsBelow('department');
      setSelection(current => ({
        ...EMPTY_SELECTION,
        university: current.university,
        faculty: current.faculty,
        department,
      }));
      try {
        const response = await client.getProgrammes(department.id);
        setProgrammes(response.data ?? []);
      } catch {
        setError('Unable to load programmes. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [client, resetOptionsBelow]
  );

  const selectProgramme = useCallback(
    async (programme: ProgrammeHierarchyItem) => {
      setLoading(true);
      setError(null);
      resetOptionsBelow('programme');
      setSelection(current => ({
        ...current,
        programme,
        level: null,
        semester: null,
      }));
      try {
        await loadProgrammeOptions(programme);
      } catch {
        setError('Unable to load levels and semesters. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [loadProgrammeOptions, resetOptionsBelow]
  );

  const selectLevel = useCallback((level: LevelHierarchyItem) => {
    setSelection(current => ({ ...current, level }));
  }, []);

  const selectSemester = useCallback((semester: SemesterHierarchyItem) => {
    setSelection(current => ({ ...current, semester }));
  }, []);

  return {
    universities,
    faculties,
    departments,
    programmes,
    levels,
    semesters,
    selection,
    loading,
    error,
    hydrate,
    selectUniversity,
    selectFaculty,
    selectDepartment,
    selectProgramme,
    selectLevel,
    selectSemester,
  };
};
