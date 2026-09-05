import type { Guide } from '@/types/guide';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const firstString = (...values: unknown[]): string | undefined =>
  values.find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0
  )?.trim();

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const getAuthor = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!isRecord(value)) return 'Unknown author';
  return (
    firstString(value.fullname, value.fullName, value.name, value.username) ??
    'Unknown author'
  );
};

const estimateReadTime = (content: string): string => {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  return `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
};

export const normalizeGuide = (value: unknown): Guide => {
  const record = isRecord(value) ? value : {};
  const content = firstString(record.content, record.body) ?? '';
  const description = firstString(record.description, record.summary);

  return {
    id: firstString(record.id, record._id) ?? '',
    title: firstString(record.title, record.name) ?? 'Untitled guide',
    content,
    description: description ?? content.slice(0, 120),
    category: firstString(record.category, record.categoryName) ?? 'Uncategorized',
    readTime:
      firstString(record.readTime, record.read_time) ?? estimateReadTime(content),
    likes: Math.max(
      0,
      firstNumber(record.likes, record.likesCount, record.likeCount) ?? 0
    ),
    isLiked: Boolean(record.isLiked ?? record.likedByUser ?? record.userHasLiked),
    author: getAuthor(record.author ?? record.createdBy),
    createdAt: firstString(record.createdAt, record.publishedAt) ?? '',
    status: firstString(record.status) ?? 'Unknown',
    isFeatured:
      typeof record.isFeatured === 'boolean' ? record.isFeatured : undefined,
  };
};

export const normalizeGuides = (value: unknown): Guide[] =>
  Array.isArray(value)
    ? value.map(normalizeGuide).filter(guide => Boolean(guide.id))
    : [];
