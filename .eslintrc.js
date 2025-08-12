module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  plugins: ['react', 'react-hooks', 'react-native'],
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/no-unescaped-entities': 'off',

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native specific rules - relaxed for development
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 'off',
    'react-native/sort-styles': 'off', // Disable strict style sorting

    // General code quality rules - relaxed for development
    'no-console': 'off',
    'no-debugger': 'error',
    'prefer-const': 'warn',
    'no-var': 'off',
    eqeqeq: ['warn', 'always'],
    curly: ['warn', 'all'],
    'no-multiple-empty-lines': ['warn', { max: 5 }],
    'no-trailing-spaces': 'off',
    'eol-last': 'off',

    // TypeScript rules - relaxed for development
    '@typescript-eslint/no-unused-vars': 'off',

    // Import rules - relaxed for development
    'import/no-unresolved': 'warn',

    // Jest rules - relaxed for test files
    'no-undef': 'off', // Allow jest globals in test files
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
    jest: true, // Allow jest globals
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
    'jest.setup.js', // Ignore jest setup file
  ],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-undef': 'off',
      },
    },
  ],
};
