import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ADMIN.STATS);

      if (!response.ok) {
        throw new Error('Failed to fetch system stats');
      }

      const data = await response.json();
      setStats(data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading system statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>❌ Error Loading Statistics</h3>
          <p>{error}</p>
          <button style={styles.retryButton} onClick={fetchSystemStats}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>System Overview</h1>
        <button style={styles.refreshButton} onClick={fetchSystemStats}>
          🔄 Refresh
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>👥</span>
            <span style={styles.metricLabel}>Total Users</span>
          </div>
          <div style={styles.metricValue}>{stats?.users?.total || 0}</div>
          <div style={styles.metricSubtext}>
            {stats?.users?.active || 0} active
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>✅</span>
            <span style={styles.metricLabel}>Verified Users</span>
          </div>
          <div style={styles.metricValue}>{stats?.users?.verified || 0}</div>
          <div style={styles.metricSubtext}>
            {((stats?.users?.verified / stats?.users?.total) * 100 || 0).toFixed(1)}% of total
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>🆕</span>
            <span style={styles.metricLabel}>New Today</span>
          </div>
          <div style={styles.metricValue}>{stats?.users?.newToday || 0}</div>
          <div style={styles.metricSubtext}>
            {stats?.users?.activeToday || 0} active today
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>⏱️</span>
            <span style={styles.metricLabel}>System Uptime</span>
          </div>
          <div style={styles.metricValue}>{formatUptime(stats?.system?.uptime || 0)}</div>
          <div style={styles.metricSubtext}>
            {stats?.system?.environment || 'unknown'} mode
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div style={styles.detailsGrid}>
        {/* User Statistics */}
        <div style={styles.detailCard}>
          <h3 style={styles.detailTitle}>User Statistics</h3>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Users:</span>
            <span style={styles.statValue}>{stats?.users?.total || 0}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Active Users:</span>
            <span style={styles.statValue}>{stats?.users?.active || 0}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Administrators:</span>
            <span style={styles.statValue}>{stats?.users?.admins || 0}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Moderators:</span>
            <span style={styles.statValue}>{stats?.users?.moderators || 0}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Verified Emails:</span>
            <span style={styles.statValue}>{stats?.users?.verified || 0}</span>
          </div>
        </div>

        {/* System Information */}
        <div style={styles.detailCard}>
          <h3 style={styles.detailTitle}>System Information</h3>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Node.js Version:</span>
            <span style={styles.statValue}>{stats?.system?.nodeVersion || 'Unknown'}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Environment:</span>
            <span style={styles.statValue}>{stats?.system?.environment || 'Unknown'}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Memory Used:</span>
            <span style={styles.statValue}>{formatBytes(stats?.system?.memory?.heapUsed || 0)}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Memory Total:</span>
            <span style={styles.statValue}>{formatBytes(stats?.system?.memory?.heapTotal || 0)}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Uptime:</span>
            <span style={styles.statValue}>{formatUptime(stats?.system?.uptime || 0)}</span>
          </div>
        </div>

        {/* Database Statistics */}
        <div style={styles.detailCard}>
          <h3 style={styles.detailTitle}>Database Statistics</h3>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Collections:</span>
            <span style={styles.statValue}>{stats?.database?.collections || 0}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Data Size:</span>
            <span style={styles.statValue}>{formatBytes(stats?.database?.dataSize || 0)}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Index Size:</span>
            <span style={styles.statValue}>{formatBytes(stats?.database?.indexSize || 0)}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Storage Size:</span>
            <span style={styles.statValue}>{formatBytes(stats?.database?.storageSize || 0)}</span>
          </div>
        </div>

        {/* Activity Summary */}
        <div style={styles.detailCard}>
          <h3 style={styles.detailTitle}>Recent Activity</h3>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>New Users Today:</span>
            <span style={styles.statValue}>{stats?.users?.newToday || 0}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Active Today:</span>
            <span style={styles.statValue}>{stats?.users?.activeToday || 0}</span>
          </div>
          <div style={styles.activityIndicator}>
            <div style={styles.activityBar}>
              <div 
                style={{
                  ...styles.activityFill,
                  width: `${Math.min((stats?.users?.activeToday / stats?.users?.total) * 100 || 0, 100)}%`
                }}
              ></div>
            </div>
            <span style={styles.activityText}>
              {((stats?.users?.activeToday / stats?.users?.total) * 100 || 0).toFixed(1)}% daily activity
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '0',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },

  refreshButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#6b7280',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },

  error: {
    textAlign: 'center',
    padding: '48px',
    color: '#dc2626',
  },

  retryButton: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },

  metricCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s',
  },

  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  metricIcon: {
    fontSize: '20px',
  },

  metricLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
  },

  metricValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },

  metricSubtext: {
    fontSize: '14px',
    color: '#9ca3af',
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },

  detailCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
  },

  detailTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #f3f4f6',
  },

  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f9fafb',
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  statValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '600',
  },

  activityIndicator: {
    marginTop: '16px',
    padding: '12px 0',
  },

  activityBar: {
    height: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },

  activityFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },

  activityText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
if (!document.head.querySelector('style[data-component="SystemStats"]')) {
  styleSheet.setAttribute('data-component', 'SystemStats');
  document.head.appendChild(styleSheet);
}

export default SystemStats;