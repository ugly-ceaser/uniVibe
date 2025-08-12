import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, canPerformAction } from '@/utils/api';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'GUEST' | 'STUDENT' | 'ADMIN';
  requiredAction?: 'view' | 'create' | 'edit' | 'delete' | 'moderate';
  fallback?: ReactNode;
  showLoading?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'GUEST',
  requiredAction,
  fallback,
  showLoading = true,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading && showLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#667eea' />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return (
      fallback || (
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedMessage}>
            Please log in to access this content.
          </Text>
        </View>
      )
    );
  }

  // Check role-based access
  if (requiredRole && !hasRole(user.role, requiredRole)) {
    return (
      fallback || (
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>Insufficient Permissions</Text>
          <Text style={styles.accessDeniedMessage}>
            You need {requiredRole} access to view this content.
          </Text>
        </View>
      )
    );
  }

  // Check action-based permissions
  if (requiredAction && !canPerformAction(user.role, requiredAction)) {
    return (
      fallback || (
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>Action Not Permitted</Text>
          <Text style={styles.accessDeniedMessage}>
            You don't have permission to {requiredAction} this content.
          </Text>
        </View>
      )
    );
  }

  // User has access, render children
  return <>{children}</>;
};

// Higher-order component for protecting components
export const withProtection = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) => {
  const ProtectedComponent: React.FC<P> = props => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withProtection(${Component.displayName || Component.name})`;
  return ProtectedComponent;
};

// Role-specific route components
export const StudentRoute: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ProtectedRoute requiredRole='STUDENT' fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const AdminRoute: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ProtectedRoute requiredRole='ADMIN' fallback={fallback}>
    {children}
  </ProtectedRoute>
);

// Action-specific route components
export const CreateRoute: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ProtectedRoute requiredAction='create' fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const EditRoute: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ProtectedRoute requiredAction='edit' fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const DeleteRoute: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ProtectedRoute requiredAction='delete' fallback={fallback}>
    {children}
  </ProtectedRoute>
);

export const ModerateRoute: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ProtectedRoute requiredAction='moderate' fallback={fallback}>
    {children}
  </ProtectedRoute>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter_400Regular',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
});
