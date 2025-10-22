import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, fallbackRoute = '/' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  console.log('🔐 ProtectedRoute check:', {
    path: location.pathname,
    isAuthenticated,
    isLoading,
    user,
    requiredRole
  });

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Checking authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the current location so we can redirect back after login
    return <Navigate to={fallbackRoute} state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={styles.accessDeniedContainer}>
        <div style={styles.accessDeniedIcon}>🔒</div>
        <h2 style={styles.accessDeniedTitle}>Access Denied</h2>
        <p style={styles.accessDeniedMessage}>
          You don't have permission to access this page.
        </p>
        <button 
          style={styles.backButton}
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Render the protected component
  return children;
};

// Higher-order component for protecting specific components
export const withProtection = (
  WrappedComponent, 
  requiredRole = null, 
  fallbackRoute = '/'
) => {
  const ProtectedComponent = (props) => {
    return (
      <ProtectedRoute 
        requiredRole={requiredRole} 
        fallbackRoute={fallbackRoute}
      >
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };

  ProtectedComponent.displayName = `withProtection(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return ProtectedComponent;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500',
    margin: 0,
  },
  accessDeniedContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
    textAlign: 'center',
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  accessDeniedIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
  },
  accessDeniedTitle: {
    color: '#1e293b',
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  accessDeniedMessage: {
    color: '#64748b',
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '32px',
    maxWidth: '400px',
    margin: '0 0 32px 0',
  },
  backButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#2563eb',
      transform: 'translateY(-1px)',
    },
  },
};

export default ProtectedRoute;