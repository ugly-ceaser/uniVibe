import type { AuthUser } from '@/utils/authSession';

const CONTENT_MANAGER_ROLES = new Set(['ADMIN', 'MODERATOR']);

export const canManageForumContent = (
  user: AuthUser | null | undefined,
  authorId: string | undefined
): boolean => {
  if (!user) return false;
  if (typeof user.id === 'string' && user.id === authorId) return true;
  return (
    typeof user.role === 'string' &&
    CONTENT_MANAGER_ROLES.has(user.role.toUpperCase())
  );
};
