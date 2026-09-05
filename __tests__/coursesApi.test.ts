import { aiApi, courseMaterialsApi, coursesApi } from '@/utils/api';

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

describe('coursesApi', () => {
  const createApi = () =>
    ({
      authGet: jest.fn().mockResolvedValue({ data: [] }),
      authPost: jest.fn().mockResolvedValue({ message: 'ok' }),
      authDelete: jest.fn().mockResolvedValue({ message: 'ok' }),
    } as unknown as ReturnType<typeof import('@/utils/api').useApi>);

  it('sends the complete hierarchy selection to the catalog endpoint', async () => {
    const api = createApi();
    await coursesApi(api).getAll({
      universityId: 'uni-1',
      facultyId: 'fac-1',
      departmentId: 'dept-1',
      programmeId: 'prog-1',
      levelId: 'level-1',
      semesterId: 'semester-1',
    });

    expect(api.authGet).toHaveBeenCalledWith(
      '/courses?universityId=uni-1&facultyId=fac-1&departmentId=dept-1&programmeId=prog-1&levelId=level-1&semesterId=semester-1',
      false
    );
  });

  it('uses authenticated enrollment endpoints', async () => {
    const api = createApi();
    const client = coursesApi(api);

    await client.enroll('course-1');
    await client.unenroll('course-1');

    expect(api.authPost).toHaveBeenNthCalledWith(1, '/courses/course-1/enroll');
    expect(api.authPost).toHaveBeenNthCalledWith(
      2,
      '/courses/course-1/unenroll'
    );
  });

  it('normalizes course detail responses', async () => {
    const api = createApi();
    (api.authGet as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 'course-1',
        code: 'CSC 301',
        name: 'Data Structures',
        credits: 3,
      },
    });

    await expect(coursesApi(api).getById('course-1')).resolves.toMatchObject({
      data: {
        id: 'course-1',
        courseCode: 'CSC 301',
        title: 'Data Structures',
        creditUnit: 3,
      },
    });
  });

  it('loads and uploads course materials through authenticated endpoints', async () => {
    const api = createApi();
    (api.authGet as jest.Mock).mockResolvedValueOnce({
      data: {
        materials: [
          {
            id: 'material-1',
            fileName: 'lecture.pdf',
            fileUrl: 'https://files.example/lecture.pdf',
          },
        ],
      },
    });
    (api.authPost as jest.Mock).mockResolvedValueOnce({
      data: {
        material: {
          id: 'material-2',
          name: 'notes.pdf',
          url: 'https://files.example/notes.pdf',
        },
      },
    });

    const client = courseMaterialsApi(api);
    await expect(client.list('course-1')).resolves.toMatchObject({
      data: [
        {
          id: 'material-1',
          name: 'lecture.pdf',
          url: 'https://files.example/lecture.pdf',
        },
      ],
    });

    await client.upload('course-1', {
      uri: 'file:///notes.pdf',
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      webFile: new Blob(['notes'], { type: 'application/pdf' }),
    });
    expect(api.authPost).toHaveBeenCalledWith(
      '/courses/course-1/materials',
      expect.any(FormData)
    );
  });

  it('uses the persistent course-session endpoints', async () => {
    const api = createApi();
    const client = aiApi(api);

    await client.getCourseActiveSession('course-1');
    await client.deleteChatSession('session-1');

    expect(api.authGet).toHaveBeenCalledWith(
      '/ai/courses/course-1/chats/session'
    );
    expect(api.authDelete).toHaveBeenCalledWith('/ai/sessions/session-1');
  });
});
