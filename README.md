# UniVibe - University Survival Guide App

A comprehensive React Native mobile application designed to help university freshers navigate their first year with AI assistance, course management, community features, and essential survival tips.

## 🚀 Features

- **AI Chat Assistant** - Get instant help with university life questions
- **Survival Tips** - Categorized advice for academics, social life, budgeting, and safety
- **Course Management** - Track your courses and academic progress
- **Community Forum** - Connect with fellow students
- **Campus Map** - Navigate your university campus
- **User Profiles** - Personalized experience and progress tracking

## 🛠️ Tech Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: Expo Router
- **UI Components**: Custom components with React Native
- **Icons**: Lucide React Native
- **Styling**: StyleSheet with Linear Gradients
- **Testing**: Jest with React Native Testing Library
- **Code Quality**: ESLint, Prettier, Husky

## 📱 Screenshots

_Add screenshots of your app here_

## 🏗️ Project Structure

```
uniVibe/
├── app/                    # Expo Router app directory
│   ├── (tabs)/           # Tab-based navigation
│   ├── _layout.tsx       # Root layout component
│   └── *.tsx             # Screen components
├── components/            # Reusable UI components
├── data/                 # Static data and mock content
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── constants/            # App constants and configuration
└── __tests__/            # Test files
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/univibe.git
   cd univibe
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Run on your device/simulator**
   - Scan the QR code with Expo Go app (mobile)
   - Press 'i' for iOS simulator
   - Press 'a' for Android emulator

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

The project aims for 70%+ test coverage across:

- Components
- Hooks
- Utility functions
- Data validation

## 🔧 Development

### Code Quality Tools

- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **TypeScript** - Type safety and IntelliSense
- **Husky** - Git hooks for pre-commit checks

### Available Scripts

```bash
npm run dev              # Start development server
npm run build:web        # Build for web
npm run build:android    # Build for Android
npm run build:ios        # Build for iOS
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # Run TypeScript type checking
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

### Code Style Guidelines

- Use TypeScript for all new code
- Follow ESLint rules and Prettier formatting
- Write meaningful commit messages
- Add tests for new features
- Use proper TypeScript types and interfaces

## 📦 Building for Production

### Web Build

```bash
npm run build:web
```

### Mobile Builds

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. **Create/Update Feature**
2. **Write Tests** - Ensure new code is covered
3. **Run Linting** - `npm run lint`
4. **Format Code** - `npm run format`
5. **Run Tests** - `npm test`
6. **Type Check** - `npm run type-check`
7. **Commit Changes** - Use conventional commit format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Expo team for the amazing framework
- React Native community for continuous improvements
- All contributors who help improve this project

## 📞 Support

If you have any questions or need help:

- Open an issue on GitHub
- Check the documentation
- Contact the development team

---

**Made with ❤️ for university students everywhere**
