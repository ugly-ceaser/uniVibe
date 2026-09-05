import {
  normalizeCourse,
  normalizeCourseMaterial,
  normalizeCourses,
} from '@/utils/course';

describe('course normalization', () => {
  it('normalizes legacy and canonical course field names at the API boundary', () => {
    expect(
      normalizeCourse({
        id: 'course-1',
        code: 'CSC 301',
        name: 'Data Structures',
        credits: '3',
        instructor: { fullname: 'Dr Ada' },
      })
    ).toMatchObject({
      id: 'course-1',
      courseCode: 'CSC 301',
      title: 'Data Structures',
      creditUnit: 3,
      instructor: 'Dr Ada',
    });

    expect(
      normalizeCourse({
        id: 'course-2',
        courseCode: 'MTH 201',
        title: 'Calculus',
        creditUnit: 2,
      })
    ).toMatchObject({
      courseCode: 'MTH 201',
      title: 'Calculus',
      creditUnit: 2,
    });
  });

  it('drops course records without an identifier', () => {
    expect(
      normalizeCourses([{ name: 'Unknown' }, { id: 'ok', name: 'Known' }])
    ).toHaveLength(1);
  });

  it('normalizes material file metadata from backend aliases', () => {
    expect(
      normalizeCourseMaterial({
        id: 'material-1',
        fileName: 'lecture.pdf',
        downloadUrl: 'https://files.example/lecture.pdf',
        fileSize: '2048',
        createdAt: '2026-09-03T08:00:00.000Z',
      })
    ).toEqual({
      id: 'material-1',
      name: 'lecture.pdf',
      url: 'https://files.example/lecture.pdf',
      mimeType: undefined,
      sizeBytes: 2048,
      uploadedAt: '2026-09-03T08:00:00.000Z',
      aiSummarized: undefined,
    });
  });
});
