export const AUTH_STORAGE_KEYS = {
  user: 'user',
  token: 'token',
} as const;

export const ONBOARDING_STORAGE_KEY = 'hasCompletedOnboarding';

export type AuthUser = Record<string, unknown> & {
  id?: string;
  fullname?: string;
  role?: string;
  department?: string;
  faculty?: string;
  level?: string | number;
  email?: string;
  username?: string;
  avatarUrl?: string;
};

export type AuthSession = {
  user: AuthUser;
  token: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const extractAuthSession = (response: unknown): AuthSession | null => {
  if (!isRecord(response)) {
    return null;
  }

  const payload = isRecord(response.data) ? response.data : response;
  if (!isRecord(payload.user) || !isNonEmptyString(payload.token)) {
    return null;
  }

  return {
    user: payload.user,
    token: payload.token,
  };
};

export const parseStoredAuthSession = (
  storedUser: string | null,
  storedToken: string | null
): AuthSession | null => {
  if (!storedUser || !isNonEmptyString(storedToken)) {
    return null;
  }

  try {
    const user: unknown = JSON.parse(storedUser);
    if (!isRecord(user)) {
      return null;
    }

    return { user, token: storedToken };
  } catch {
    return null;
  }
};
