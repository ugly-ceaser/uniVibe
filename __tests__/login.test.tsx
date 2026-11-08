import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import LoginScreen from '@/app/login';
import { ApiError } from '@/utils/api';

jest.setTimeout(15000);

const mockLogin = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, isLoading: false }),
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

// The global lucide mock in jest.setup.js lacks the icons this screen uses.
jest.mock('lucide-react-native', () => ({
  Mail: 'Mail',
  Lock: 'Lock',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const showMessageMock = showMessage as jest.Mock;

const submit = (screen: ReturnType<typeof render>) => {
  fireEvent.changeText(
    screen.getByPlaceholderText('you@university.edu'),
    'student@university.edu'
  );
  fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'secret123');
  fireEvent.press(screen.getByText('Sign in'));
};

describe('LoginScreen rate limit message', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    showMessageMock.mockClear();
  });

  it('shows the server retry time when login is rate limited', async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiError('Too many attempts. Try again in 42 seconds.', 429)
    );
    const screen = render(<LoginScreen />);

    submit(screen);

    await waitFor(() => {
      expect(showMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Too Many Attempts',
          description: 'Too many attempts. Try again in 42 seconds.',
        })
      );
    });
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'student@university.edu',
      password: 'secret123',
    });
  });

  it('falls back to the generic wait text when the 429 has no message', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError('', 429));
    const screen = render(<LoginScreen />);

    submit(screen);

    await waitFor(() => {
      expect(showMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Too Many Attempts',
          description: 'Please wait a moment before trying again.',
        })
      );
    });
  });
});
