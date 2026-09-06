import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('@/utils/api', () => ({
  api: {
    setToken: jest.fn(),
    clearToken: jest.fn(),
    authGet: jest.fn(),
    setSessionInvalidationHandler: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

const asyncStorage = jest.requireMock(
  '@react-native-async-storage/async-storage'
).default as {
  multiGet: jest.Mock;
  multiSet: jest.Mock;
  multiRemove: jest.Mock;
  setItem: jest.Mock;
};

const apiModule = jest.requireMock('@/utils/api') as {
  api: {
    setToken: jest.Mock;
    clearToken: jest.Mock;
    authGet: jest.Mock;
    setSessionInvalidationHandler: jest.Mock;
  };
  authApi: {
    login: jest.Mock;
    register: jest.Mock;
  };
};

let currentAuth: ReturnType<typeof useAuth> | undefined;
let consoleWarnSpy: jest.SpyInstance;

const AuthConsumer = () => {
  currentAuth = useAuth();
  return null;
};

const renderAuthProvider = () =>
  render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );

describe('AuthProvider', () => {
  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentAuth = undefined;
    asyncStorage.multiGet.mockResolvedValue([
      ['user', null],
      ['token', null],
    ]);
    asyncStorage.multiSet.mockResolvedValue(undefined);
    asyncStorage.multiRemove.mockResolvedValue(undefined);
    asyncStorage.setItem.mockResolvedValue(undefined);
    apiModule.api.authGet.mockResolvedValue({
      data: { id: 'user-1', fullname: 'Ada Student' },
    });
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('restores only a complete saved session and synchronizes the API token', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1","fullname":"Ada Student"}'],
      ['token', 'saved-token'],
    ]);

    renderAuthProvider();

    await waitFor(() => expect(currentAuth?.loading).toBe(false));
    expect(currentAuth?.isAuthenticated).toBe(true);
    expect(currentAuth?.user).toEqual({
      id: 'user-1',
      fullname: 'Ada Student',
    });
    expect(apiModule.api.setToken).toHaveBeenCalledWith('saved-token');
    expect(apiModule.api.authGet).toHaveBeenCalledWith('/user/profile', false);
    expect(asyncStorage.multiRemove).not.toHaveBeenCalled();
  });

  it.each([401, 404])('removes a saved session rejected with %s', async status => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1"}'], ['token', 'old-token'],
    ]);
    apiModule.api.authGet.mockRejectedValueOnce(new ApiError('Invalid session', status));
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.loading).toBe(false));
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(asyncStorage.multiRemove).toHaveBeenCalledWith(['user', 'token']);
  });

  it('does not open protected screens or erase credentials on a network failure', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1"}'], ['token', 'saved-token'],
    ]);
    apiModule.api.authGet.mockRejectedValueOnce(new ApiError('Offline', 0));
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.loading).toBe(false));
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(asyncStorage.multiRemove).not.toHaveBeenCalled();
  });

  it('cannot restore an old session after logout during validation', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1"}'], ['token', 'saved-token'],
    ]);
    let finish!: (response: unknown) => void;
    apiModule.api.authGet.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    renderAuthProvider();
    await waitFor(() => expect(apiModule.api.authGet).toHaveBeenCalled());
    expect(currentAuth?.loading).toBe(true);
    expect(currentAuth?.isAuthenticated).toBe(false);
    await act(async () => { await currentAuth?.logout(); });
    await act(async () => { finish({ data: { id: 'user-1' } }); });
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(currentAuth?.loading).toBe(false);
  });

  it('clears storage and authentication when the shared client invalidates a session', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1"}'], ['token', 'saved-token'],
    ]);
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.isAuthenticated).toBe(true));
    await act(async () => {
      apiModule.api.setSessionInvalidationHandler.mock.calls.at(-1)?.[0]?.();
    });
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(asyncStorage.multiRemove).toHaveBeenCalledWith(['user', 'token']);
  });

  it('removes partial saved credentials instead of restoring a half-session', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', null],
      ['token', 'orphaned-token'],
    ]);

    renderAuthProvider();

    await waitFor(() => expect(currentAuth?.loading).toBe(false));
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(apiModule.api.clearToken).toHaveBeenCalled();
    expect(asyncStorage.multiRemove).toHaveBeenCalledWith(['user', 'token']);
  });

  it('persists and activates a validated login session', async () => {
    apiModule.authApi.login.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
        token: 'new-token',
      },
    });
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.loading).toBe(false));

    await act(async () => {
      await currentAuth?.login({
        email: 'student@example.test',
        password: 'password',
      });
    });

    expect(asyncStorage.multiSet).toHaveBeenCalledWith([
      ['user', '{"id":"user-1"}'],
      ['token', 'new-token'],
    ]);
    expect(apiModule.api.setToken).toHaveBeenCalledWith('new-token');
    expect(currentAuth?.isAuthenticated).toBe(true);
  });

  it('rejects an incomplete login response without persisting it', async () => {
    apiModule.authApi.login.mockResolvedValue({ user: { id: 'user-1' } });
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.loading).toBe(false));

    await act(async () => {
      await expect(
        currentAuth?.login({
          email: 'student@example.test',
          password: 'password',
        })
      ).rejects.toThrow('invalid login response');
    });
    expect(asyncStorage.multiSet).not.toHaveBeenCalled();
    expect(currentAuth?.isAuthenticated).toBe(false);
  });

  it('does not create authenticated state from registration responses', async () => {
    apiModule.authApi.register.mockResolvedValue({
      user: { id: 'user-1' },
      token: 'unexpected-token',
    });
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.loading).toBe(false));

    await act(async () => {
      await currentAuth?.register({
        username: 'student',
        firstname: 'Ada',
        lastname: 'Student',
        email: 'student@example.test',
        password: 'password',
      });
    });

    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(asyncStorage.multiSet).not.toHaveBeenCalled();
    expect(apiModule.api.setToken).not.toHaveBeenCalled();
  });

  it('updates the shared and persisted user after a profile save', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1","fullname":"Ada Student"}'],
      ['token', 'saved-token'],
    ]);
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.isAuthenticated).toBe(true));

    const updatedUser = {
      id: 'user-1',
      fullname: 'Ada Lovelace',
      programme: 'Computer Science',
    };
    await act(async () => {
      await currentAuth?.updateUser(updatedUser);
    });

    expect(currentAuth?.user).toEqual(updatedUser);
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify(updatedUser)
    );
  });

  it('clears in-memory access even when storage removal fails during logout', async () => {
    asyncStorage.multiGet.mockResolvedValue([
      ['user', '{"id":"user-1"}'],
      ['token', 'saved-token'],
    ]);
    renderAuthProvider();
    await waitFor(() => expect(currentAuth?.isAuthenticated).toBe(true));
    asyncStorage.multiRemove.mockRejectedValueOnce(new Error('storage failed'));

    await act(async () => {
      await currentAuth?.logout();
    });

    expect(apiModule.api.clearToken).toHaveBeenCalled();
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(currentAuth?.user).toBeNull();
  });
});
