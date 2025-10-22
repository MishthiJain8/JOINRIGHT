import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });

  useEffect(() => {
    fetchLogs();
  }, [filters.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        userId: filters.userId,
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.LOGS}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setLogs(data.data.logs);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN': return '🔐';
      case 'LOGOUT': return '🚪';
      case 'CREATED': return '👤';
      case 'UPDATED': return '✏️';
      case 'DELETED': return '🗑️';
      default: return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'LOGIN': return '#10b981';
      case 'LOGOUT': return '#6b7280';
      case 'CREATED': return '#3b82f6';
      case 'UPDATED': return '#f59e0b';
      case 'DELETED': return '#ef4444';
      default: return '#8b5cf6';
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const applyFilters = () => {
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 50
    });
    setTimeout(fetchLogs, 100);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Activity Logs</h1>
        <button style={styles.refreshButton} onClick={fetchLogs}>
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filtersRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>User ID:</label>
            <input
              type="text"
              style={styles.filterInput}
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Start Date:</label>
            <input
              type="datetime-local"
              style={styles.filterInput}
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>End Date:</label>
            <input
              type="datetime-local"
              style={styles.filterInput}
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div style={styles.filterActions}>
          <button style={styles.applyButton} onClick={applyFilters}>
            Apply Filters
          </button>
          <button style={styles.clearButton} onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorContainer}>
          <span style={styles.errorIcon}>❌</span>
          <span style={styles.errorText}>{error}</span>
          <button style={styles.retryButton} onClick={fetchLogs}>
            Retry
          </button>
        </div>
      )}

      {/* Logs Summary */}
      <div style={styles.summaryContainer}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>📊</span>
          <div style={styles.summaryContent}>
            <span style={styles.summaryValue}>{logs.length}</span>
            <span style={styles.summaryLabel}>Log Entries</span>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>👥</span>
          <div style={styles.summaryContent}>
            <span style={styles.summaryValue}>
              {new Set(logs.map(log => log.userId)).size}
            </span>
            <span style={styles.summaryLabel}>Unique Users</span>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.summaryIcon}>📅</span>
          <div style={styles.summaryContent}>
            <span style={styles.summaryValue}>
              {logs.filter(log => {
                const logDate = new Date(log.timestamp);
                const today = new Date();
                return logDate.toDateString() === today.toDateString();
              }).length}
            </span>
            <span style={styles.summaryLabel}>Today's Activity</span>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={styles.logsContainer}>
        {logs.length === 0 ? (
          <div style={styles.noLogs}>
            <span style={styles.noLogsIcon}>📭</span>
            <h3>No Activity Logs Found</h3>
            <p>No activity logs match your current filters.</p>
          </div>
        ) : (
          <div style={styles.logsList}>
            {logs.map((log, index) => (
              <div key={`${log.userId}-${index}`} style={styles.logEntry}>
                <div style={styles.logIcon}>
                  <span style={{
                    ...styles.actionIcon,
                    backgroundColor: getActionColor(log.action)
                  }}>
                    {getActionIcon(log.action)}
                  </span>
                </div>

                <div style={styles.logContent}>
                  <div style={styles.logHeader}>
                    <span style={styles.logAction}>{log.action}</span>
                    <span style={styles.logTime}>{formatDate(log.timestamp)}</span>
                  </div>

                  <div style={styles.logDetails}>
                    <div style={styles.logUser}>
                      <span style={styles.userLabel}>User:</span>
                      <span style={styles.userValue}>{log.email || 'Unknown'}</span>
                      <span style={styles.userId}>({log.userId})</span>
                    </div>

                    {log.details && (
                      <div style={styles.logMetadata}>
                        {log.details.role && (
                          <span style={styles.metadataItem}>
                            Role: <strong>{log.details.role}</strong>
                          </span>
                        )}
                        {log.details.isActive !== undefined && (
                          <span style={styles.metadataItem}>
                            Status: <strong>{log.details.isActive ? 'Active' : 'Inactive'}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <button
          style={styles.pageButton}
          disabled={filters.page === 1}
          onClick={() => handleFilterChange('page', filters.page - 1)}
        >
          Previous
        </button>
        <span style={styles.pageInfo}>Page {filters.page}</span>
        <button
          style={styles.pageButton}
          disabled={logs.length < filters.limit}
          onClick={() => handleFilterChange('page', filters.page + 1)}
        >
          Next
        </button>
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

  filtersContainer: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  },

  filtersRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
  },

  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },

  filterInput: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },

  filterActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },

  applyButton: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },

  clearButton: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },

  summaryContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },

  summaryCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  summaryIcon: {
    fontSize: '24px',
    padding: '8px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
  },

  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
  },

  summaryValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
  },

  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  logsContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
    overflow: 'hidden',
  },

  logsList: {
    maxHeight: '600px',
    overflowY: 'auto',
  },

  logEntry: {
    display: 'flex',
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },

  logIcon: {
    marginRight: '16px',
  },

  actionIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },

  logContent: {
    flex: 1,
  },

  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  logAction: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },

  logTime: {
    fontSize: '14px',
    color: '#6b7280',
  },

  logDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  logUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },

  userLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },

  userValue: {
    color: '#1f2937',
    fontWeight: '600',
  },

  userId: {
    color: '#9ca3af',
    fontSize: '12px',
  },

  logMetadata: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },

  metadataItem: {
    fontSize: '12px',
    color: '#6b7280',
  },

  noLogs: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },

  noLogsIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    display: 'block',
  },

  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },

  pageButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },

  pageInfo: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
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

export default ActivityLogs;