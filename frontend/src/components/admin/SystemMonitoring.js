import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';

const SystemMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchSystemHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      
      // Fetch both general health and admin health using proper API configuration
      const [healthResponse, adminHealthResponse, statsResponse] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}/api/health`),
        makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ADMIN.HEALTH),
        makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ADMIN.STATS)
      ]);

      const healthData = await healthResponse.json();
      const adminHealthData = adminHealthResponse.ok ? await adminHealthResponse.json() : null;
      const statsData = statsResponse.ok ? await statsResponse.json() : null;

      setSystemHealth({
        ...healthData,
        admin: adminHealthData,
        stats: statsData?.data || null
      });
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('System health fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthStatus = () => {
    if (error) return { color: '#ef4444', text: 'Error', icon: '❌' };
    if (!systemHealth.status) return { color: '#6b7280', text: 'Unknown', icon: '❓' };
    if (systemHealth.status === 'OK') return { color: '#10b981', text: 'Healthy', icon: '✅' };
    return { color: '#f59e0b', text: 'Warning', icon: '⚠️' };
  };

  const getDatabaseStatus = () => {
    const dbHealth = systemHealth.database;
    if (!dbHealth) return { color: '#6b7280', text: 'Unknown', icon: '❓' };
    if (dbHealth.status === 'connected') return { color: '#10b981', text: 'Connected', icon: '🟢' };
    return { color: '#ef4444', text: 'Disconnected', icon: '🔴' };
  };

  const getMemoryUsagePercentage = () => {
    // Try to get memory from different possible sources
    const memory = systemHealth.memory || systemHealth.stats?.system?.memory;
    if (!memory) return 0;
    
    // Handle different memory data formats
    let used, total;
    if (memory.heapUsed && memory.heapTotal) {
      // Node.js memory format
      used = memory.heapUsed;
      total = memory.heapTotal;
    } else if (memory.used && memory.total) {
      // General memory format
      used = memory.used;
      total = memory.total;
    } else {
      return 0;
    }
    
    return Math.round((used / total) * 100);
  };

  const status = getHealthStatus();
  const dbStatus = getDatabaseStatus();

  if (loading && !systemHealth.status) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading system monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>System Monitoring</h1>
          <div style={styles.lastUpdate}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
        <button style={styles.refreshButton} onClick={fetchSystemHealth}>
          🔄 Refresh
        </button>
      </div>

      {/* Status Overview */}
      <div style={styles.statusGrid}>
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>{status.icon}</span>
            <span style={styles.statusLabel}>System Status</span>
          </div>
          <div style={styles.statusValue} data-color={status.color}>
            {status.text}
          </div>
        </div>

        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>{dbStatus.icon}</span>
            <span style={styles.statusLabel}>Database</span>
          </div>
          <div style={styles.statusValue} data-color={dbStatus.color}>
            {dbStatus.text}
          </div>
        </div>

        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>⏱️</span>
            <span style={styles.statusLabel}>Uptime</span>
          </div>
          <div style={styles.statusValue}>
            {systemHealth.uptime ? formatUptime(systemHealth.uptime) : 'Unknown'}
          </div>
        </div>

        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>🌍</span>
            <span style={styles.statusLabel}>Environment</span>
          </div>
          <div style={styles.statusValue}>
            {systemHealth.environment || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorContainer}>
          <span style={styles.errorIcon}>❌</span>
          <span style={styles.errorText}>
            Error fetching system data: {error}
          </span>
          <button style={styles.retryButton} onClick={fetchSystemHealth}>
            Retry
          </button>
        </div>
      )}

      {/* Detailed Metrics */}
      <div style={styles.metricsGrid}>
        {/* Memory Usage */}
        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Memory Usage</h3>
          <div style={styles.metricContent}>
            <div style={styles.memoryBar}>
              <div 
                style={{
                  ...styles.memoryFill,
                  width: `${getMemoryUsagePercentage()}%`,
                  backgroundColor: getMemoryUsagePercentage() > 80 ? '#ef4444' : 
                                  getMemoryUsagePercentage() > 60 ? '#f59e0b' : '#10b981'
                }}
              ></div>
            </div>
            <div style={styles.memoryStats}>
              <div style={styles.memoryStat}>
                <span style={styles.memoryLabel}>Used:</span>
                <span style={styles.memoryValue}>
                  {(() => {
                    const memory = systemHealth.memory || systemHealth.stats?.system?.memory;
                    if (!memory) return 'N/A';
                    const used = memory.heapUsed || memory.used;
                    return used ? formatBytes(used) : 'N/A';
                  })()}
                </span>
              </div>
              <div style={styles.memoryStat}>
                <span style={styles.memoryLabel}>Total:</span>
                <span style={styles.memoryValue}>
                  {(() => {
                    const memory = systemHealth.memory || systemHealth.stats?.system?.memory;
                    if (!memory) return 'N/A';
                    const total = memory.heapTotal || memory.total;
                    return total ? formatBytes(total) : 'N/A';
                  })()}
                </span>
              </div>
              <div style={styles.memoryStat}>
                <span style={styles.memoryLabel}>Usage:</span>
                <span style={styles.memoryValue}>{getMemoryUsagePercentage()}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Server Information</h3>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Node.js Version:</span>
              <span style={styles.infoValue}>{systemHealth.stats?.system?.nodeVersion || 'Unknown'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Environment:</span>
              <span style={styles.infoValue}>{systemHealth.environment || systemHealth.stats?.system?.environment || 'Unknown'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Server Uptime:</span>
              <span style={styles.infoValue}>{systemHealth.uptime ? formatUptime(systemHealth.uptime) : 'Unknown'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Memory Usage:</span>
              <span style={styles.infoValue}>
                {systemHealth.stats?.system?.memory ? 
                  `${formatBytes(systemHealth.stats.system.memory.heapUsed)} / ${formatBytes(systemHealth.stats.system.memory.heapTotal)}` 
                  : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Information */}
        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Database Information</h3>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Status:</span>
              <span style={{
                ...styles.infoValue,
                color: dbStatus.color,
                fontWeight: '600'
              }}>
                {dbStatus.text}
              </span>
            </div>
            {systemHealth.database?.name && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Database:</span>
                <span style={styles.infoValue}>{systemHealth.database.name}</span>
              </div>
            )}
            {systemHealth.database?.collections !== undefined && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Collections:</span>
                <span style={styles.infoValue}>{systemHealth.database.collections}</span>
              </div>
            )}
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Last Check:</span>
              <span style={styles.infoValue}>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* API Health */}
        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>API Health</h3>
          <div style={styles.apiHealthList}>
            <div style={styles.apiEndpoint}>
              <div style={styles.endpointInfo}>
                <span style={styles.endpointName}>General Health</span>
                <span style={styles.endpointUrl}>GET /api/health</span>
              </div>
              <div style={styles.endpointStatus}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: systemHealth.status === 'OK' ? '#10b981' : '#ef4444'
                }}>
                  {systemHealth.status === 'OK' ? 'UP' : 'DOWN'}
                </span>
              </div>
            </div>

            <div style={styles.apiEndpoint}>
              <div style={styles.endpointInfo}>
                <span style={styles.endpointName}>Admin Health</span>
                <span style={styles.endpointUrl}>GET /api/admin/health</span>
              </div>
              <div style={styles.endpointStatus}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: systemHealth.admin?.success ? '#10b981' : '#ef4444'
                }}>
                  {systemHealth.admin?.success ? 'UP' : 'DOWN'}
                </span>
              </div>
            </div>

            <div style={styles.apiEndpoint}>
              <div style={styles.endpointInfo}>
                <span style={styles.endpointName}>Database Connection</span>
                <span style={styles.endpointUrl}>MongoDB Connection</span>
              </div>
              <div style={styles.endpointStatus}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: dbStatus.color
                }}>
                  {dbStatus.text.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      {getMemoryUsagePercentage() > 80 && (
        <div style={styles.alertContainer}>
          <div style={styles.alert}>
            <span style={styles.alertIcon}>⚠️</span>
            <div style={styles.alertContent}>
              <span style={styles.alertTitle}>High Memory Usage</span>
              <span style={styles.alertText}>
                Memory usage is at {getMemoryUsagePercentage()}%. Consider monitoring application performance and potentially restarting the server.
              </span>
            </div>
          </div>
        </div>
      )}
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
    alignItems: 'flex-start',
    marginBottom: '24px',
  },

  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },

  lastUpdate: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
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

  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },

  statusCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
  },

  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  statusIcon: {
    fontSize: '20px',
  },

  statusLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  statusValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },

  metricCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
  },

  metricTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #f3f4f6',
  },

  metricContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  memoryBar: {
    height: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    overflow: 'hidden',
  },

  memoryFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.5s ease',
  },

  memoryStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  memoryStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  memoryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  memoryValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '600',
  },

  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f9fafb',
  },

  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word',
  },

  apiHealthList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  apiEndpoint: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f9fafb',
  },

  endpointInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  endpointName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },

  endpointUrl: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },

  endpointStatus: {
    display: 'flex',
    alignItems: 'center',
  },

  statusBadge: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
  },

  alertContainer: {
    marginTop: '24px',
  },

  alert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef3cd',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
  },

  alertIcon: {
    fontSize: '20px',
  },

  alertContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
  },

  alertText: {
    fontSize: '14px',
    color: '#b45309',
    lineHeight: '1.4',
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

  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    marginBottom: '24px',
  },

  errorIcon: {
    fontSize: '20px',
  },

  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500',
  },

  retryButton: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

export default SystemMonitoring;