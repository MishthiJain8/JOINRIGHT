import React from 'react';

const AdminSidebar = ({ activeSection, setActiveSection, collapsed }) => {
  const menuItems = [
    {
      id: 'overview',
      title: 'System Overview',
      icon: '📊',
      description: 'System statistics and health'
    },
    {
      id: 'users',
      title: 'User Management', 
      icon: '👥',
      description: 'Manage all users'
    },
    {
      id: 'messages',
      title: 'Contact Messages',
      icon: '💬',
      description: 'View and manage contact form submissions'
    },
    {
      id: 'monitoring',
      title: 'System Monitoring',
      icon: '🔧',
      description: 'Monitor system performance'
    },
    {
      id: 'logs',
      title: 'Activity Logs',
      icon: '📋',
      description: 'View system activity logs'
    },
    {
      id: 'cyber-scores',
      title: 'Cyber Score Management',
      icon: '🛡️',
      description: 'Manage user cyber scores and reviews'
    },
    {
      id: 'cyber-scores-debug',
      title: 'CyberScore Debug',
      icon: '🐛',
      description: 'Debug cyber score loading issues'
    },
    {
      id: 'cyber-scores-simple',
      title: 'CyberScore Simple Test',
      icon: '⚙️',
      description: 'Simple working version for testing'
    },
    {
      id: 'advanced-user-ops',
      title: 'Advanced User Operations',
      icon: '⚙️',
      description: 'Delete history, cancel meetings, change passwords'
    }
  ];

  return (
    <aside style={{
      ...styles.sidebar,
      width: collapsed ? '80px' : '280px'
    }}>
      <div style={styles.sidebarContent}>
        {/* Navigation Menu */}
        <nav style={styles.nav}>
          {menuItems.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(activeSection === item.id ? styles.navItemActive : {}),
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '12px' : '16px 20px'
              }}
              onClick={() => setActiveSection(item.id)}
              title={collapsed ? item.title : ''}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && (
                <div style={styles.navContent}>
                  <span style={styles.navTitle}>{item.title}</span>
                  <span style={styles.navDescription}>{item.description}</span>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Quick Stats (if not collapsed) */}
        {!collapsed && (
          <div style={styles.quickStats}>
            <h3 style={styles.quickStatsTitle}>Quick Stats</h3>
            <div style={styles.quickStatsGrid}>
              <div style={styles.quickStatCard}>
                <span style={styles.quickStatValue}>🟢</span>
                <span style={styles.quickStatLabel}>System</span>
              </div>
              <div style={styles.quickStatCard}>
                <span style={styles.quickStatValue}>👤</span>
                <span style={styles.quickStatLabel}>Online</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer (if not collapsed) */}
        {!collapsed && (
          <div style={styles.footer}>
            <div style={styles.version}>
              <span style={styles.versionLabel}>Version</span>
              <span style={styles.versionNumber}>v1.0.0</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    backgroundColor: '#fff',
    borderRight: '1px solid #e5e7eb',
    height: 'calc(100vh - 70px)',
    position: 'fixed',
    left: 0,
    top: '70px',
    transition: 'width 0.3s ease',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
    zIndex: 100,
    overflowY: 'auto',
  },

  sidebarContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },

  nav: {
    flex: 1,
  },

  navItem: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    margin: '2px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    position: 'relative',
  },

  navItemActive: {
    backgroundColor: '#f0f9ff',
    borderLeft: '3px solid #3b82f6',
    color: '#1e40af',
  },

  navIcon: {
    fontSize: '20px',
    minWidth: '20px',
    textAlign: 'center',
  },

  navContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },

  navTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '2px',
  },

  navDescription: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.3',
  },

  quickStats: {
    margin: '24px 16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },

  quickStatsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 12px 0',
  },

  quickStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },

  quickStatCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },

  quickStatValue: {
    fontSize: '16px',
    marginBottom: '4px',
  },

  quickStatLabel: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '500',
  },

  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #f3f4f6',
    marginTop: 'auto',
  },

  version: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  versionLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },

  versionNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
  },
};

export default AdminSidebar;