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

const DEVELOPMENT_API_URL = 'http://localhost:3000/api/v1';
const PRODUCTION_API_URL = 'https://univibesbackend.onrender.com/api/v1';
const DEFAULT_API_TIMEOUT = 30000;

const normalizeUrl = (url: string): string => url.replace(/\/+$/, '');

const getPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment =
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : process.env.NODE_ENV !== 'production';
  const isProduction = !isDevelopment;

  return {
    app: {
      name: 'UniVibe',
      version: '1.0.0',
      environment: isDevelopment ? 'development' : 'production',
    },
    api: {
      baseUrl: normalizeUrl(
        process.env['EXPO_PUBLIC_API_URL'] ||
          (isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL)
      ),
      timeout: getPositiveNumber(
        process.env['EXPO_PUBLIC_API_TIMEOUT'],
        DEFAULT_API_TIMEOUT
      ),
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
  const baseUrl = normalizeUrl(config.api.baseUrl);
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

export const getHealthUrl = (baseUrl = config.api.baseUrl): string => {
  const serverUrl = normalizeUrl(baseUrl).replace(/\/api(?:\/v\d+)?$/i, '');
  return `${serverUrl}/health`;
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
