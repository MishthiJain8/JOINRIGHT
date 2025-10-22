import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';
import { useDebounceApi } from '../../hooks/useDebounceApi';

const AdvancedUserOperations = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [meetingHistory, setMeetingHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Operation states
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordReason, setPasswordReason] = useState('');
  
  // Meeting password change states
  const [meetingPasswordDialog, setMeetingPasswordDialog] = useState(null);
  const [meetingNewPassword, setMeetingNewPassword] = useState('');
  const [meetingPasswordReason, setMeetingPasswordReason] = useState('');

  const { debouncedApiCall } = useDebounceApi();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserMeetingHistory();
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users?limit=1000`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserMeetingHistory = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users/${selectedUser}/meeting-history`
      );
      if (response.ok) {
        const data = await response.json();
        setMeetingHistory(data.data);
        setSelectedUserData(data.data.user);
      } else {
        setMeetingHistory(null);
        setError('Failed to load meeting history');
      }
    } catch (err) {
      setMeetingHistory(null);
      console.error('Error loading meeting history:', err);
    }
  };

  const handleDeleteMeetingHistory = async () => {
    if (!selectedUser || !selectedUserData) return;

    setOperationInProgress(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users/${selectedUser}/meeting-history`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully deleted ${result.data.deletedMeetings} meetings for ${result.data.userEmail}`);
        await loadUserMeetingHistory(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to delete meeting history: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to delete meeting history');
      console.error('Error deleting meeting history:', err);
    } finally {
      setOperationInProgress(false);
      setConfirmDialog(null);
    }
  };

  const handleCancelFutureMeetings = async () => {
    if (!selectedUser || !selectedUserData) return;

    setOperationInProgress(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users/${selectedUser}/cancel-future-meetings`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully cancelled ${result.data.cancelledCount} future meetings for ${result.data.userEmail}`);
        await loadUserMeetingHistory(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to cancel future meetings: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to cancel future meetings');
      console.error('Error cancelling future meetings:', err);
    } finally {
      setOperationInProgress(false);
      setConfirmDialog(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword || !passwordReason) {
      alert('Please provide both a new password and a reason');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setOperationInProgress(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users/${selectedUser}/change-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword,
            reason: passwordReason
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully changed password for ${result.data.userEmail}`);
        setNewPassword('');
        setPasswordReason('');
        setPasswordDialog(false);
      } else {
        const error = await response.json();
        alert(`Failed to change password: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to change password');
      console.error('Error changing password:', err);
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleChangeMeetingPassword = async () => {
    if (!meetingPasswordDialog?.meetingId || !meetingNewPassword || !meetingPasswordReason) {
      alert('Please provide both a new meeting password and a reason');
      return;
    }

    if (meetingNewPassword.length < 6) {
      alert('Meeting password must be at least 6 characters long');
      return;
    }

    setOperationInProgress(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/meetings/${meetingPasswordDialog.meetingId}/change-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: meetingNewPassword,
            reason: meetingPasswordReason
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully changed password for meeting "${result.data.meetingTitle}"`);
        setMeetingNewPassword('');
        setMeetingPasswordReason('');
        setMeetingPasswordDialog(null);
        // Refresh meeting data to show changes
        await loadUserMeetingHistory();
      } else {
        const error = await response.json();
        alert(`Failed to change meeting password: ${error.error}`);
      }
    } catch (err) {
      alert('Failed to change meeting password');
      console.error('Error changing meeting password:', err);
    } finally {
      setOperationInProgress(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading user data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Advanced User Operations</h2>
        <p style={styles.subtitle}>
          Manage user meeting history, cancel future meetings, and change passwords
        </p>
      </div>

      {error && (
        <div style={styles.errorContainer}>
          <div style={styles.error}>{error}</div>
        </div>
      )}

      {/* User Selection */}
      <div style={styles.selectionContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Select User:</label>
          <select 
            style={styles.filterSelect}
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              setMeetingHistory(null);
              setSelectedUserData(null);
              setError(null);
            }}
          >
            <option value="">-- Select a user --</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedUserData && (
        <div style={styles.userInfoCard}>
          <h3 style={styles.userInfoTitle}>Selected User</h3>
          <div style={styles.userInfoContent}>
            <div style={styles.userInfoRow}>
              <span style={styles.userInfoLabel}>Name:</span>
              <span style={styles.userInfoValue}>{selectedUserData.name}</span>
            </div>
            <div style={styles.userInfoRow}>
              <span style={styles.userInfoLabel}>Email:</span>
              <span style={styles.userInfoValue}>{selectedUserData.email}</span>
            </div>
            <div style={styles.userInfoRow}>
              <span style={styles.userInfoLabel}>User ID:</span>
              <span style={styles.userInfoValue}>{selectedUserData.id}</span>
            </div>
          </div>
        </div>
      )}

      {meetingHistory && (
        <div style={styles.historyCard}>
          <h3 style={styles.cardTitle}>Meeting History Summary</h3>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{meetingHistory.summary.totalMeetings}</div>
              <div style={styles.summaryLabel}>Total Meetings</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{meetingHistory.summary.pastMeetings}</div>
              <div style={styles.summaryLabel}>Past Meetings</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{meetingHistory.summary.futureMeetings}</div>
              <div style={styles.summaryLabel}>Future Meetings</div>
            </div>
          </div>

          <div style={styles.recentMeetings}>
            <h4 style={styles.sectionTitle}>Recent Meetings</h4>
            {meetingHistory.recentMeetings.length === 0 ? (
              <div style={styles.noMeetings}>No meetings found for this user</div>
            ) : (
              <div style={styles.meetingsList}>
                {meetingHistory.recentMeetings.map((meeting, index) => (
                  <div key={index} style={styles.meetingItem}>
                    <div style={styles.meetingHeader}>
                      <span style={styles.meetingTitle}>{meeting.title}</span>
                      <div style={styles.meetingHeaderActions}>
                        <span style={{
                          ...styles.meetingStatus,
                          color: meeting.isPast ? '#6b7280' : '#10b981'
                        }}>
                          {meeting.isPast ? '🕒 Past' : '📅 Future'}
                        </span>
                        <button
                          style={{
                            ...styles.meetingPasswordButton,
                            opacity: operationInProgress ? 0.6 : 1
                          }}
                          onClick={() => setMeetingPasswordDialog({
                            meetingId: meeting.id,
                            meetingTitle: meeting.title,
                            scheduledTime: meeting.scheduledTime,
                            isHost: meeting.isHost
                          })}
                          disabled={operationInProgress}
                          title="Change meeting password"
                        >
                          🔑 Change Password
                        </button>
                      </div>
                    </div>
                    <div style={styles.meetingDetails}>
                      <span style={styles.meetingTime}>
                        📍 {formatDate(meeting.scheduledTime)}
                      </span>
                      <span style={styles.meetingRole}>
                        {meeting.isHost ? '👤 Host' : '👥 Participant'}
                      </span>
                      <span style={styles.meetingStatusBadge}>
                        Status: {meeting.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedUser && (
        <div style={styles.operationsCard}>
          <h3 style={styles.cardTitle}>Available Operations</h3>
          <div style={styles.operationsGrid}>
            <div style={styles.operationItem}>
              <div style={styles.operationHeader}>
                <span style={styles.operationIcon}>🗑️</span>
                <span style={styles.operationTitle}>Delete Meeting History</span>
              </div>
              <p style={styles.operationDescription}>
                Permanently delete all meeting history for this user (past and future meetings)
              </p>
              <button
                style={{
                  ...styles.operationButton,
                  ...styles.dangerButton,
                  opacity: operationInProgress ? 0.6 : 1
                }}
                onClick={() => setConfirmDialog({
                  type: 'delete-history',
                  title: 'Delete Meeting History',
                  message: `Are you sure you want to delete ALL meeting history for ${selectedUserData?.name}? This action cannot be undone.`,
                  action: handleDeleteMeetingHistory
                })}
                disabled={operationInProgress}
              >
                {operationInProgress ? 'Processing...' : 'Delete Meeting History'}
              </button>
            </div>

            <div style={styles.operationItem}>
              <div style={styles.operationHeader}>
                <span style={styles.operationIcon}>❌</span>
                <span style={styles.operationTitle}>Cancel Future Meetings</span>
              </div>
              <p style={styles.operationDescription}>
                Cancel all future scheduled meetings for this user
              </p>
              <button
                style={{
                  ...styles.operationButton,
                  ...styles.warningButton,
                  opacity: operationInProgress ? 0.6 : 1
                }}
                onClick={() => setConfirmDialog({
                  type: 'cancel-meetings',
                  title: 'Cancel Future Meetings',
                  message: `Are you sure you want to cancel all future meetings for ${selectedUserData?.name}?`,
                  action: handleCancelFutureMeetings
                })}
                disabled={operationInProgress}
              >
                {operationInProgress ? 'Processing...' : 'Cancel Future Meetings'}
              </button>
            </div>

            <div style={styles.operationItem}>
              <div style={styles.operationHeader}>
                <span style={styles.operationIcon}>🔑</span>
                <span style={styles.operationTitle}>Change Password</span>
              </div>
              <p style={styles.operationDescription}>
                Change the user's password (admin override)
              </p>
              <button
                style={{
                  ...styles.operationButton,
                  ...styles.primaryButton,
                  opacity: operationInProgress ? 0.6 : 1
                }}
                onClick={() => setPasswordDialog(true)}
                disabled={operationInProgress}
              >
                {operationInProgress ? 'Processing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{confirmDialog.title}</h3>
            <div style={styles.modalBody}>
              <p style={styles.modalMessage}>{confirmDialog.message}</p>
              <div style={styles.warningBox}>
                <span style={styles.warningIcon}>⚠️</span>
                <span style={styles.warningText}>
                  This action cannot be undone. Please proceed with caution.
                </span>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setConfirmDialog(null)}
                disabled={operationInProgress}
              >
                Cancel
              </button>
              <button
                style={styles.confirmButton}
                onClick={confirmDialog.action}
                disabled={operationInProgress}
              >
                {operationInProgress ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      {passwordDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Change User Password</h3>
            <div style={styles.modalBody}>
              <p style={styles.modalMessage}>
                Change password for: <strong>{selectedUserData?.name}</strong>
              </p>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>New Password (minimum 8 characters):</label>
                <input
                  type="password"
                  style={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..."
                  minLength="8"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Reason for password change:</label>
                <textarea
                  style={styles.textarea}
                  value={passwordReason}
                  onChange={(e) => setPasswordReason(e.target.value)}
                  placeholder="Explain why you're changing this user's password..."
                  rows="3"
                />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setPasswordDialog(false);
                  setNewPassword('');
                  setPasswordReason('');
                }}
                disabled={operationInProgress}
              >
                Cancel
              </button>
              <button
                style={styles.confirmButton}
                onClick={handleChangePassword}
                disabled={operationInProgress || !newPassword || !passwordReason}
              >
                {operationInProgress ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Password Change Dialog */}
      {meetingPasswordDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Change Meeting Password</h3>
            <div style={styles.modalBody}>
              <p style={styles.modalMessage}>
                Change password for meeting: <strong>"{meetingPasswordDialog.meetingTitle}"</strong>
              </p>
              <div style={styles.meetingInfoBox}>
                <div style={styles.meetingInfoItem}>
                  <span style={styles.meetingInfoLabel}>Scheduled:</span>
                  <span style={styles.meetingInfoValue}>{formatDate(meetingPasswordDialog.scheduledTime)}</span>
                </div>
                <div style={styles.meetingInfoItem}>
                  <span style={styles.meetingInfoLabel}>Role:</span>
                  <span style={styles.meetingInfoValue}>
                    {meetingPasswordDialog.isHost ? 'Host' : 'Participant'}
                  </span>
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>New Meeting Password (minimum 6 characters):</label>
                <input
                  type="password"
                  style={styles.input}
                  value={meetingNewPassword}
                  onChange={(e) => setMeetingNewPassword(e.target.value)}
                  placeholder="Enter new meeting password..."
                  minLength="6"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Reason for meeting password change:</label>
                <textarea
                  style={styles.textarea}
                  value={meetingPasswordReason}
                  onChange={(e) => setMeetingPasswordReason(e.target.value)}
                  placeholder="Explain why you're changing this meeting's password..."
                  rows="3"
                />
              </div>
              <div style={styles.warningBox}>
                <span style={styles.warningIcon}>⚠️</span>
                <span style={styles.warningText}>
                  Changing the meeting password will require all participants to use the new password.
                </span>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setMeetingPasswordDialog(null);
                  setMeetingNewPassword('');
                  setMeetingPasswordReason('');
                }}
                disabled={operationInProgress}
              >
                Cancel
              </button>
              <button
                style={styles.confirmButton}
                onClick={handleChangeMeetingPassword}
                disabled={operationInProgress || !meetingNewPassword || !meetingPasswordReason}
              >
                {operationInProgress ? 'Changing...' : 'Change Meeting Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '100%',
  },
  
  header: {
    marginBottom: '32px',
  },
  
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  
  loading: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#6b7280',
    padding: '40px',
  },
  
  errorContainer: {
    marginBottom: '24px',
  },
  
  error: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
  },
  
  selectionContainer: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  filterLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    minWidth: '120px',
  },
  
  filterSelect: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    minWidth: '300px',
    color: '#111827',
    fontWeight: '500',
  },
  
  userInfoCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  
  userInfoTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
  },
  
  userInfoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  userInfoRow: {
    display: 'flex',
    alignItems: 'center',
  },
  
  userInfoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    minWidth: '80px',
  },
  
  userInfoValue: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: '500',
  },
  
  historyCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '20px',
  },
  
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  
  summaryItem: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  
  summaryValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: '4px',
  },
  
  summaryLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  recentMeetings: {
    marginTop: '24px',
  },
  
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  
  noMeetings: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '20px',
  },
  
  meetingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  meetingItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #f3f4f6',
  },
  
  meetingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  
  meetingTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  
  meetingHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  meetingStatus: {
    fontSize: '12px',
    fontWeight: '500',
  },
  
  meetingPasswordButton: {
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  meetingDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6b7280',
    flexWrap: 'wrap',
  },
  
  meetingTime: {
    fontWeight: '500',
  },
  
  meetingRole: {
    fontWeight: '500',
  },
  
  meetingStatusBadge: {
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  
  operationsCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
  },
  
  operationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  
  operationItem: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  
  operationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  
  operationIcon: {
    fontSize: '20px',
  },
  
  operationTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  
  operationDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  
  operationButton: {
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  
  dangerButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  
  warningButton: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  
  meetingInfoBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px',
  },
  
  meetingInfoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  
  meetingInfoLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e40af',
  },
  
  meetingInfoValue: {
    fontSize: '13px',
    color: '#1e40af',
    fontWeight: '500',
  },
  
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
  },
  
  modalBody: {
    marginBottom: '24px',
  },
  
  modalMessage: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fed7aa',
    borderRadius: '6px',
  },
  
  warningIcon: {
    fontSize: '16px',
  },
  
  warningText: {
    fontSize: '12px',
    color: '#92400e',
    fontWeight: '500',
  },
  
  inputGroup: {
    marginBottom: '16px',
  },
  
  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    color: '#111827',
  },
  
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    color: '#111827',
    resize: 'vertical',
  },
  
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default AdvancedUserOperations;