import type { Course, CourseMaterial } from '@/types/course';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const stringValue = (...values: unknown[]): string | undefined =>
  values
    .find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0
    )
    ?.trim();

const numberValue = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const namedReference = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const name = stringValue(value.name, value.title);
  if (!name) return undefined;
  return { id: stringValue(value.id), name };
};

const levelReference = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const level = numberValue(value.level, value.value, value.name);
  if (level === undefined) return undefined;
  return { id: stringValue(value.id), level };
};

export const normalizeCourse = (value: unknown): Course => {
  const record = isRecord(value) ? value : {};
  const instructorRecord = isRecord(record.instructor)
    ? record.instructor
    : undefined;
  const assessment = Array.isArray(record.assessment)
    ? record.assessment
        .filter(isRecord)
        .map(item => ({
          type: stringValue(item.type, item.name) ?? '',
          percentage: numberValue(item.percentage, item.weight) ?? 0,
        }))
        .filter(item => item.type)
    : undefined;

  const semester =
    namedReference(record.semester) ??
    (typeof record.semester === 'string' || typeof record.semester === 'number'
      ? record.semester
      : undefined);
  const level =
    levelReference(record.level) ??
    (typeof record.level === 'number' ? record.level : undefined);
  const programme =
    namedReference(record.programme) ??
    (typeof record.programme === 'string' ? record.programme : undefined);

  return {
    id: stringValue(record.id, record._id) ?? '',
    courseCode: stringValue(record.courseCode, record.code) ?? '',
    title: stringValue(record.title, record.name, record.courseName) ?? '',
    creditUnit:
      numberValue(record.creditUnit, record.credits, record.unitLoad) ?? 0,
    courseType: stringValue(record.courseType, record.type),
    description: stringValue(record.description),
    instructor: stringValue(
      record.instructor,
      record.coordinator,
      instructorRecord?.name,
      instructorRecord?.fullname
    ),
    instructorEmail: stringValue(
      record.instructorEmail,
      record.coordinatorEmail,
      instructorRecord?.email
    ),
    instructorPhone: stringValue(
      record.instructorPhone,
      record.coordinatorPhone,
      instructorRecord?.phone
    ),
    outline: Array.isArray(record.outline)
      ? record.outline.filter(
          (item): item is string => typeof item === 'string'
        )
      : undefined,
    assessment,
    semester,
    level,
    programme,
  };
};

export const normalizeCourses = (values: unknown): Course[] =>
  Array.isArray(values)
    ? values.map(normalizeCourse).filter(course => course.id)
    : [];

export const normalizeCourseMaterial = (value: unknown): CourseMaterial => {
  const record = isRecord(value) ? value : {};
  return {
    id: stringValue(record.id, record._id) ?? '',
    name:
      stringValue(
        record.name,
        record.fileName,
        record.title,
        record.filename
      ) ?? 'Untitled material',
    url: stringValue(record.url, record.fileUrl, record.downloadUrl) ?? '',
    mimeType: stringValue(record.mimeType, record.contentType, record.type),
    sizeBytes: numberValue(record.sizeBytes, record.fileSize, record.size),
    uploadedAt: stringValue(
      record.uploadedAt,
      record.createdAt,
      record.updatedAt
    ),
    aiSummarized:
      typeof record.aiSummarized === 'boolean'
        ? record.aiSummarized
        : undefined,
  };
};

export const normalizeCourseMaterials = (values: unknown): CourseMaterial[] =>
  Array.isArray(values)
    ? values.map(normalizeCourseMaterial).filter(material => material.id)
    : [];
