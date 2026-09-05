import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
const ROLE_HIERARCHY: Record<string, number> = {
  GUEST: 0,
  STUDENT: 1,
  ADMIN: 2,
};

export const hasRole = (
  userRole: string | undefined,
  requiredRole: string
): boolean => {
  const userRoleNormalized = (userRole || 'GUEST').toUpperCase();
  const requiredRoleNormalized = requiredRole.toUpperCase();

  const userLevel = ROLE_HIERARCHY[userRoleNormalized] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRoleNormalized] ?? 0;

  return userLevel >= requiredLevel;
};

export const canPerformAction = (
  userRole: string | undefined,
  action: string
): boolean => {
  const userRoleNormalized = (userRole || 'GUEST').toUpperCase();

  if (userRoleNormalized === 'ADMIN') return true;
  if (userRoleNormalized === 'STUDENT') {
    return ['view', 'create', 'edit'].includes(action);
  }
  return action === 'view';
};

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
    return <LoadingState />;
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

  ProtectedComponent.displayName = `withProtection(${
    Component.displayName || Component.name
  })`;
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#EDE9F8',
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0D0D0D',
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
