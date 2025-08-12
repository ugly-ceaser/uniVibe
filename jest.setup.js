import 'react-native-gesture-handler/jestSetup';

// Mock expo modules
jest.mock('expo-font');
jest.mock('expo-splash-screen');
jest.mock('expo-status-bar');
jest.mock('expo-linear-gradient');
jest.mock('expo-camera');
jest.mock('expo-haptics');
jest.mock('expo-linking');
jest.mock('expo-web-browser');

// Mock react-native modules
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  MessageCircle: 'MessageCircle',
  X: 'X',
  Send: 'Send',
  Bot: 'Bot',
  BookOpen: 'BookOpen',
  Users: 'Users',
  DollarSign: 'DollarSign',
  Shield: 'Shield',
  ChevronRight: 'ChevronRight',
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: ({ children }) => children,
  },
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

// Global test utilities
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
