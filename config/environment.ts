interface EnvironmentConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    aiChat: boolean;
    pushNotifications: boolean;
    analytics: boolean;
  };
  external: {
    sentryDsn: string | undefined;
    googleAnalyticsId: string | undefined;
  };
  development: {
    debug: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = __DEV__;
  const isProduction = !isDevelopment;

  return {
    app: {
      name: 'UniVibe',
      version: '1.0.0',
      environment: isDevelopment ? 'development' : 'production',
    },
    api: {
      baseUrl: isDevelopment
        ? 'http://localhost:3000/api'
        : 'https://api.univibe.com',
      timeout: 30000,
    },
    features: {
      aiChat: true,
      pushNotifications: !isDevelopment,
      analytics: isProduction,
    },
    external: {
      sentryDsn: process.env['EXPO_PUBLIC_SENTRY_DSN'] || undefined,
      googleAnalyticsId:
        process.env['EXPO_PUBLIC_GOOGLE_ANALYTICS_ID'] || undefined,
    },
    development: {
      debug: isDevelopment,
      logLevel: isDevelopment ? 'debug' : 'error',
    },
  };
};

export const config = getEnvironmentConfig();

// Feature flags
export const isFeatureEnabled = (
  feature: keyof EnvironmentConfig['features']
): boolean => {
  return config.features[feature];
};

// Environment checks
export const isDevelopment = (): boolean =>
  config.app.environment === 'development';
export const isProduction = (): boolean =>
  config.app.environment === 'production';
export const isStaging = (): boolean => config.app.environment === 'staging';

// API helpers
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.api.baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

// Logging
export const log = {
  debug: (message: string, ...args: any[]) => {
    if (config.development.debug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (['debug', 'info'].includes(config.development.logLevel)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(config.development.logLevel)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
