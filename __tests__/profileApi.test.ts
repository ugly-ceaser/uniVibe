import { profileApi } from '@/utils/api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

describe('profileApi', () => {
  const profileResponse = {
    id: 'user-1',
    email: 'ada@example.test',
    fullname: 'Ada Student',
    role: 'STUDENT',
    university: { id: 'uni-1', name: 'University of Lagos' },
    faculty: { id: 'fac-1', name: 'Faculty of Science' },
    department: { id: 'dept-1', name: 'Computer Sciences' },
    programme: { id: 'prog-1', name: 'Computer Science' },
    level: 300,
    semester: 'Second',
    verificationStatus: {
      email: true,
      phone: 'VERIFIED',
      nin: 'PENDING',
      regNumber: false,
    },
  };

  const createApi = () =>
    ({
      authGet: jest.fn().mockResolvedValue({ data: profileResponse }),
      authPut: jest.fn().mockResolvedValue({ data: profileResponse }),
    } as unknown as ReturnType<typeof import('@/utils/api').useApi>);

  it('normalizes hierarchy objects and field-level verification status', async () => {
    const api = createApi();
    const response = await profileApi(api).getProfile();

    expect(response.data).toEqual(
      expect.objectContaining({
        university: 'University of Lagos',
        faculty: 'Faculty of Science',
        department: 'Computer Sciences',
        programme: 'Computer Science',
        verificationStatus: {
          email: true,
          phone: true,
          nin: false,
          regNumber: false,
        },
      })
    );
  });

  it('maps editable fields to the backend payload without verification flags', async () => {
    const api = createApi();
    await profileApi(api).updateProfile({
      fullName: 'Ada Lovelace',
      university: 'University of Lagos',
      faculty: 'Faculty of Science',
      department: 'Computer Sciences',
      programme: 'Computer Science',
      level: 300,
      semester: 'Second',
    });

    expect(api.authPut).toHaveBeenCalledWith('/user/profile', {
      fullname: 'Ada Lovelace',
      university: 'University of Lagos',
      faculty: 'Faculty of Science',
      department: 'Computer Sciences',
      programme: 'Computer Science',
      level: 300,
      semester: 'Second',
    });
  });
});
