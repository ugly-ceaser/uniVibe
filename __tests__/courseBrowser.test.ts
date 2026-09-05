import {
  addCourseOnce,
  buildCourseFilters,
  filterCourseCatalog,
  removeCourseById,
} from '@/utils/courseBrowser';
import type { Course } from '@/types/course';

const courses: Course[] = [
  {
    id: 'course-1',
    courseCode: 'CSC 301',
    title: 'Data Structures',
    creditUnit: 3,
    courseType: 'Core',
  },
  {
    id: 'course-2',
    courseCode: 'MTH 305',
    title: 'Numerical Analysis',
    creditUnit: 2,
    courseType: 'Elective',
  },
];

describe('course browser helpers', () => {
  it('only creates API filters when every hierarchy selection exists', () => {
    expect(buildCourseFilters({ universityId: 'uni-1' })).toBeNull();
    expect(
      buildCourseFilters({
        universityId: 'uni-1',
        facultyId: 'fac-1',
        departmentId: 'dept-1',
        programmeId: 'prog-1',
        levelId: 'level-1',
        semesterId: 'semester-1',
      })
    ).toEqual({
      universityId: 'uni-1',
      facultyId: 'fac-1',
      departmentId: 'dept-1',
      programmeId: 'prog-1',
      levelId: 'level-1',
      semesterId: 'semester-1',
    });
  });

  it('searches by code, title, and course type without mutating results', () => {
    expect(filterCourseCatalog(courses, 'csc')).toEqual([courses[0]]);
    expect(filterCourseCatalog(courses, 'numerical')).toEqual([courses[1]]);
    expect(filterCourseCatalog(courses, 'elective')).toEqual([courses[1]]);
    expect(filterCourseCatalog(courses, '  ')).toBe(courses);
  });

  it('supports reversible optimistic enrollment updates', () => {
    expect(addCourseOnce([courses[0]], courses[0])).toEqual([courses[0]]);
    expect(addCourseOnce([courses[0]], courses[1])).toEqual(courses);
    expect(removeCourseById(courses, 'course-1')).toEqual([courses[1]]);
  });
});
