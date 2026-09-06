import React, { type ReactNode } from 'react';
import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { AuthContext } from '@/contexts/AuthContext';
import { api, ApiError, useApi } from '@/utils/api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

describe('useApi authentication handling', () => {
  it('clears the session immediately when the API returns 401', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue('{"message":"Session expired"}'),
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider
        value={{
          user: { id: 'user-1' },
          token: 'expired-token',
          loading: false,
          isLoading: false,
          isAuthenticated: true,
          login: jest.fn(),
          register: jest.fn(),
          updateUser: jest.fn(),
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
    const { result } = renderHook(() => useApi(), { wrapper });
    api.setSessionInvalidationHandler(() => { void logout(); });

    await act(async () => {
      await expect(result.current.authGet('/private')).rejects.toEqual(
        expect.objectContaining<Partial<ApiError>>({ status: 401 })
      );
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
    api.setSessionInvalidationHandler(undefined);
    alertSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
