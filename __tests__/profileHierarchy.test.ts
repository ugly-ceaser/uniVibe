import { act, renderHook } from '@testing-library/react-native';
import {
  findHierarchyItem,
  normalizeSemester,
  useProfileHierarchy,
  type ProfileHierarchyClient,
} from '@/hooks/useProfileHierarchy';
import type { UserProfile } from '@/utils/types';

describe('profile hierarchy helpers', () => {
  const universities = [
    {
      id: 'uni-1',
      name: 'University of Lagos',
      shortName: 'UNILAG',
    },
    {
      id: 'uni-2',
      name: 'University of Nigeria, Nsukka',
      shortName: 'UNN',
    },
  ];

  it('resolves saved hierarchy names and university abbreviations', () => {
    expect(findHierarchyItem(universities, 'university of lagos')?.id).toBe(
      'uni-1'
    );
    expect(findHierarchyItem(universities, 'UNN')?.id).toBe('uni-2');
    expect(findHierarchyItem(universities, '  ')?.id).toBeUndefined();
  });

  it('normalizes semester labels returned by different hierarchy APIs', () => {
    expect(normalizeSemester('First Semester')).toBe('First');
    expect(normalizeSemester('1st Semester')).toBe('First');
    expect(normalizeSemester('Second')).toBe('Second');
    expect(normalizeSemester('2')).toBe('Second');
    expect(normalizeSemester('Summer')).toBeNull();
  });

  it('hydrates saved selections and clears dependent fields after a change', async () => {
    const secondUniversity = {
      id: 'uni-3',
      name: 'University of Ibadan',
      shortName: 'UI',
    };
    const client: ProfileHierarchyClient = {
      getUniversities: jest.fn().mockResolvedValue({
        data: [...universities, secondUniversity],
      }),
      getFaculties: jest.fn().mockImplementation((universityId: string) =>
        Promise.resolve({
          data:
            universityId === secondUniversity.id
              ? [{ id: 'fac-2', name: 'Faculty of Arts' }]
              : [{ id: 'fac-1', name: 'Faculty of Science' }],
        })
      ),
      getDepartments: jest.fn().mockResolvedValue({
        data: [{ id: 'dept-1', name: 'Computer Sciences' }],
      }),
      getProgrammes: jest.fn().mockResolvedValue({
        data: [{ id: 'prog-1', name: 'Computer Science' }],
      }),
      getLevels: jest.fn().mockResolvedValue({
        data: [{ id: 'level-1', level: 300 }],
      }),
      getSemesters: jest.fn().mockResolvedValue({
        data: [{ id: 'sem-1', name: 'Second Semester' }],
      }),
    };
    const profile: UserProfile = {
      id: 'user-1',
      email: 'ada@example.test',
      fullname: 'Ada Student',
      role: 'STUDENT',
      regNumber: 'REG-1',
      department: 'Computer Sciences',
      faculty: 'Faculty of Science',
      level: 300,
      semester: 'Second',
      phone: '',
      nin: '',
      verificationStatus: {
        email: true,
        phone: false,
        nin: false,
        regNumber: false,
      },
      status: 'Pending',
      createdAt: '2026-09-03T00:00:00.000Z',
      university: 'UNILAG',
      programme: 'Computer Science',
    };
    const { result } = renderHook(() => useProfileHierarchy(client));

    await act(async () => {
      await result.current.hydrate(profile);
    });

    expect(result.current.selection).toEqual(
      expect.objectContaining({
        university: expect.objectContaining({ id: 'uni-1' }),
        faculty: expect.objectContaining({ id: 'fac-1' }),
        department: expect.objectContaining({ id: 'dept-1' }),
        programme: expect.objectContaining({ id: 'prog-1' }),
        level: expect.objectContaining({ id: 'level-1' }),
        semester: expect.objectContaining({ id: 'sem-1' }),
      })
    );

    await act(async () => {
      await result.current.selectUniversity(secondUniversity);
    });

    expect(result.current.selection.university?.id).toBe('uni-3');
    expect(result.current.selection.faculty).toBeNull();
    expect(result.current.departments).toEqual([]);
    expect(result.current.programmes).toEqual([]);
    expect(result.current.levels).toEqual([]);
    expect(result.current.semesters).toEqual([]);
  });
});
