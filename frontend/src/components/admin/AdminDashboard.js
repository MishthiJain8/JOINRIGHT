import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';
import AdminSidebar from './AdminSidebar';
import SystemStats from './SystemStats';
import UserManagement from './UserManagement';
import ActivityLogs from './ActivityLogs';
import SystemMonitoring from './SystemMonitoring';
import ContactMessages from './ContactMessages';
import CyberScoreManagement from './CyberScoreManagement';
import CyberScoreDebug from './CyberScoreDebug';
import CyberScoreSimple from './CyberScoreSimple';
import AdvancedUserOperations from './AdvancedUserOperations';
import AdminThemeTest from './AdminThemeTest';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);

  // Force admin dashboard to always use light theme
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // Store original theme state
    const originalDataTheme = html.getAttribute('data-theme');
    const originalHtmlClasses = Array.from(html.classList);
    const originalBodyClasses = Array.from(body.classList);
    
    // Force light theme for admin dashboard
    html.setAttribute('data-theme', 'light');
    html.classList.remove('dark-mode');
    body.classList.remove('dark-mode');
    
    // Add admin-specific class to prevent theme changes
    html.classList.add('admin-theme-locked');
    body.classList.add('admin-theme-locked');
    
    // Cleanup function to restore original theme when leaving admin
    return () => {
      // Remove admin lock classes
      html.classList.remove('admin-theme-locked');
      body.classList.remove('admin-theme-locked');
      
      // Restore original data-theme attribute
      if (originalDataTheme) {
        html.setAttribute('data-theme', originalDataTheme);
      } else {
        html.removeAttribute('data-theme');
      }
      
      // Restore original HTML classes
      html.className = '';
      originalHtmlClasses.forEach(cls => {
        if (cls !== 'admin-theme-locked') {
          html.classList.add(cls);
        }
      });
      
      // Restore original body classes
      body.className = '';
      originalBodyClasses.forEach(cls => {
        if (cls !== 'admin-theme-locked') {
          body.classList.add(cls);
        }
      });
    };
  }, []);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    // Load initial system health
    checkSystemHealth();
  }, [user, navigate]);

  const checkSystemHealth = async () => {
    try {
      const response = await makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ADMIN.HEALTH);

      if (response.ok) {
        const data = await response.json();
        setSystemHealth('healthy');
      } else {
        setSystemHealth('degraded');
      }
    } catch (error) {
      console.error('System health check failed:', error);
      setSystemHealth('down');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div>
            <SystemStats />
            <AdminThemeTest />
          </div>
        );
      case 'users':
        return <UserManagement />;
      case 'messages':
        return <ContactMessages />;
      case 'monitoring':
        return <SystemMonitoring />;
      case 'logs':
        return <ActivityLogs />;
      case 'cyber-scores':
        return <CyberScoreManagement />;
      case 'cyber-scores-debug':
        return <CyberScoreDebug />;
      case 'cyber-scores-simple':
        return <CyberScoreSimple />;
      case 'advanced-user-ops':
        return <AdvancedUserOperations />;
      default:
        return (
          <div>
            <SystemStats />
            <AdminThemeTest />
          </div>
        );
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={styles.unauthorizedContainer}>
        <div style={styles.unauthorizedContent}>
          <h1 style={styles.unauthorizedTitle}>🚫 Access Denied</h1>
          <p style={styles.unauthorizedText}>You need administrator privileges to access this area.</p>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button 
            style={styles.menuButton}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            ☰
          </button>
          <h1 style={styles.headerTitle}>JointRight Admin</h1>
          <div style={styles.systemStatus}>
            <div style={{
              ...styles.statusIndicator,
              backgroundColor: systemHealth === 'healthy' ? '#10b981' : 
                             systemHealth === 'degraded' ? '#f59e0b' : '#ef4444'
            }}></div>
            <span style={styles.statusText}>
              {systemHealth === 'healthy' ? 'System Healthy' :
               systemHealth === 'degraded' ? 'System Degraded' : 'System Down'}
            </span>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user.firstName} {user.lastName}</span>
            <span style={styles.userRole}>Administrator</span>
          </div>
          <button 
            style={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={styles.mainContainer}>
        {/* Sidebar */}
        <AdminSidebar 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={sidebarCollapsed}
        />

        {/* Main Content */}
        <main style={{
          ...styles.mainContent,
          marginLeft: sidebarCollapsed ? '80px' : '280px'
        }}>
          <div style={styles.contentContainer}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  header: {
    height: '70px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  menuButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    color: '#6b7280',
    transition: 'all 0.2s',
  },

  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  systemStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '24px',
  },

  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },

  statusText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },

  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },

  userRole: {
    fontSize: '12px',
    color: '#6b7280',
  },

  logoutButton: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },

  mainContainer: {
    paddingTop: '70px',
    display: 'flex',
    minHeight: 'calc(100vh - 70px)',
  },

  mainContent: {
    flex: 1,
    padding: '24px',
    transition: 'margin-left 0.3s ease',
    overflow: 'hidden',
  },

  contentContainer: {
    maxWidth: '100%',
    animation: 'fadeIn 0.5s ease-out',
  },

  unauthorizedContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  unauthorizedContent: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  },

  unauthorizedTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },

  unauthorizedText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '32px',
  },

  backButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
};

// Add CSS animation keyframes and admin theme lock styles
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.admin-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Force admin dashboard to always use light theme */
html.admin-theme-locked,
html.admin-theme-locked *,
body.admin-theme-locked,
body.admin-theme-locked * {
  color-scheme: light !important;
}

/* Override any dark theme styles for admin */
html.admin-theme-locked {
  background-color: #ffffff !important;
  color: #1f2937 !important;
}

body.admin-theme-locked {
  background-color: #f8fafc !important;
  color: #1f2937 !important;
}

/* Ensure admin components stay light themed */
.admin-theme-locked [class*="admin"],
.admin-theme-locked [class*="Admin"] {
  background-color: inherit !important;
  color: inherit !important;
}

/* Prevent theme toggle from affecting admin */
.admin-theme-locked .dark-mode,
.admin-theme-locked[data-theme="dark"] {
  background-color: #f8fafc !important;
  color: #1f2937 !important;
}

/* Fix form elements in admin dashboard */
.admin-theme-locked select,
.admin-theme-locked input,
.admin-theme-locked textarea,
.admin-theme-locked option {
  background-color: #ffffff !important;
  color: #111827 !important;
  border-color: #d1d5db !important;
}

.admin-theme-locked select:focus,
.admin-theme-locked input:focus,
.admin-theme-locked textarea:focus {
  background-color: #ffffff !important;
  color: #111827 !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 1px #3b82f6 !important;
  outline: none !important;
}

.admin-theme-locked select:hover,
.admin-theme-locked input:hover,
.admin-theme-locked textarea:hover {
  background-color: #ffffff !important;
  color: #111827 !important;
  border-color: #9ca3af !important;
}

/* Ensure option elements are visible */
.admin-theme-locked select option,
.admin-theme-locked datalist option {
  background-color: #ffffff !important;
  color: #111827 !important;
  padding: 8px 12px !important;
}

/* Fix placeholder text */
.admin-theme-locked input::placeholder,
.admin-theme-locked textarea::placeholder {
  color: #6b7280 !important;
  opacity: 1 !important;
}

/* Fix disabled form elements */
.admin-theme-locked select:disabled,
.admin-theme-locked input:disabled,
.admin-theme-locked textarea:disabled {
  background-color: #f9fafb !important;
  color: #6b7280 !important;
  border-color: #e5e7eb !important;
  opacity: 0.7 !important;
}
`;
if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}

export default AdminDashboard;