import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { config, log } from '@/config/environment';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    log.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (config.external.sentryDsn) {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    // Navigate to home screen
    // You can implement navigation logic here
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReportError = (): void => {
    if (this.state.error) {
      const errorDetails = {
        message: this.state.error.message,
        stack: this.state.error.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        appVersion: config.app.version,
        environment: config.app.environment,
      };

      // In a real app, you might want to send this to your backend
      log.error('User reported error:', errorDetails);

      Alert.alert(
        'Error Reported',
        'Thank you for reporting this error. Our team has been notified and will investigate.',
        [{ text: 'OK' }]
      );
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <AlertTriangle size={64} color='#ef4444' strokeWidth={2} />

              <Text style={styles.title}>Oops! Something went wrong</Text>

              <Text style={styles.message}>
                We're sorry, but something unexpected happened. Our team has
                been notified and is working to fix this issue.
              </Text>

              {config.development.debug && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Debug Information:</Text>
                  <Text style={styles.debugText}>
                    Error: {this.state.error.message}
                  </Text>
                  {this.state.errorInfo?.componentStack && (
                    <Text style={styles.debugText}>
                      Component Stack: {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={this.handleRetry}
                  accessibilityRole='button'
                  accessibilityLabel='Retry'
                >
                  <RefreshCw size={20} color='#ffffff' strokeWidth={2} />
                  <Text style={styles.primaryButtonText}>Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={this.handleGoHome}
                  accessibilityRole='button'
                  accessibilityLabel='Go to home'
                >
                  <Home size={20} color='#667eea' strokeWidth={2} />
                  <Text style={styles.secondaryButtonText}>Go Home</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.reportButton}
                onPress={this.handleReportError}
                accessibilityRole='button'
                accessibilityLabel='Report error'
              >
                <Text style={styles.reportButtonText}>Report This Error</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  debugContainer: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  debugTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
  reportButton: {
    paddingVertical: 8,
  },
  reportButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});
