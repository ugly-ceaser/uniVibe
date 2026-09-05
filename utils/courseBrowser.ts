import type { Course } from '@/types/course';

export interface CourseFilterIds {
  universityId: string;
  facultyId: string;
  departmentId: string;
  programmeId: string;
  levelId: string;
  semesterId: string;
}

export const buildCourseFilters = (selection: {
  universityId?: string;
  facultyId?: string;
  departmentId?: string;
  programmeId?: string;
  levelId?: string;
  semesterId?: string;
}): CourseFilterIds | null => {
  const {
    universityId,
    facultyId,
    departmentId,
    programmeId,
    levelId,
    semesterId,
  } = selection;

  if (
    !universityId ||
    !facultyId ||
    !departmentId ||
    !programmeId ||
    !levelId ||
    !semesterId
  ) {
    return null;
  }

  return {
    universityId,
    facultyId,
    departmentId,
    programmeId,
    levelId,
    semesterId,
  };
};

export const filterCourseCatalog = (
  courses: Course[],
  query: string
): Course[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return courses;
  }

  return courses.filter(course =>
    [course.courseCode, course.title, course.courseType]
      .filter((value): value is string => Boolean(value))
      .some(value => value.toLowerCase().includes(normalizedQuery))
  );
};

export const addCourseOnce = (courses: Course[], course: Course): Course[] =>
  courses.some(item => item.id === course.id) ? courses : [...courses, course];

export const removeCourseById = (
  courses: Course[],
  courseId: string
): Course[] => courses.filter(course => course.id !== courseId);
