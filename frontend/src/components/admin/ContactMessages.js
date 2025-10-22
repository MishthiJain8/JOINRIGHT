import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';

const ContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusSummary, setStatusSummary] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchMessages = async (page = 1, status = '') => {
    try {
      setLoading(true);
      const url = `${API_CONFIG.ENDPOINTS.CONTACT.MESSAGES}?page=${page}&limit=20${status ? `&status=${status}` : ''}`;
      const response = await makeAuthenticatedRequest(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();
      setMessages(result.data.messages);
      setPagination(result.data.pagination);
      setStatusSummary(result.data.statusSummary);
      setError('');
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openMessageModal = async (message) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.CONTACT.MESSAGES}/${message._id}`);
      const result = await response.json();
      
      if (response.ok) {
        setSelectedMessage(result.data);
        setModalOpen(true);
        // Refresh the list to update the read status
        fetchMessages(currentPage, statusFilter);
      }
    } catch (err) {
      console.error('Error fetching message details:', err);
    }
  };

  const updateMessageStatus = async (messageId, status, adminNotes = '') => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.CONTACT.MESSAGES}/${messageId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, adminNotes })
        }
      );

      if (response.ok) {
        setModalOpen(false);
        fetchMessages(currentPage, statusFilter);
      }
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSubjectDisplay = (subject) => {
    const subjectMap = {
      'technical-support': 'Technical Support',
      'billing': 'Billing',
      'feature-request': 'Feature Request',
      'partnership': 'Partnership',
      'general': 'General'
    };
    return subjectMap[subject] || subject;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { color: '#3b82f6', bg: '#eff6ff', text: 'New' },
      read: { color: '#f59e0b', bg: '#fffbeb', text: 'Read' },
      replied: { color: '#10b981', bg: '#f0fdf4', text: 'Replied' },
      resolved: { color: '#6b7280', bg: '#f9fafb', text: 'Resolved' }
    };
    
    const config = statusConfig[status] || statusConfig.new;
    return (
      <span style={{
        ...styles.badge,
        color: config.color,
        backgroundColor: config.bg
      }}>
        {config.text}
      </span>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading contact messages...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Contact Messages</h2>
        <div style={styles.summary}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total:</span>
            <span style={styles.summaryValue}>{Object.values(statusSummary).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>New:</span>
            <span style={{...styles.summaryValue, color: '#3b82f6'}}>{statusSummary.new || 0}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Pending:</span>
            <span style={{...styles.summaryValue, color: '#f59e0b'}}>{statusSummary.read || 0}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterButton,
            ...(statusFilter === '' ? styles.filterButtonActive : {})
          }}
          onClick={() => handleStatusFilter('')}
        >
          All Messages
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(statusFilter === 'new' ? styles.filterButtonActive : {})
          }}
          onClick={() => handleStatusFilter('new')}
        >
          New ({statusSummary.new || 0})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(statusFilter === 'read' ? styles.filterButtonActive : {})
          }}
          onClick={() => handleStatusFilter('read')}
        >
          Read ({statusSummary.read || 0})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(statusFilter === 'replied' ? styles.filterButtonActive : {})
          }}
          onClick={() => handleStatusFilter('replied')}
        >
          Replied ({statusSummary.replied || 0})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(statusFilter === 'resolved' ? styles.filterButtonActive : {})
          }}
          onClick={() => handleStatusFilter('resolved')}
        >
          Resolved ({statusSummary.resolved || 0})
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* Messages Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Status</th>
              <th style={styles.tableHeaderCell}>Name</th>
              <th style={styles.tableHeaderCell}>Email</th>
              <th style={styles.tableHeaderCell}>Subject</th>
              <th style={styles.tableHeaderCell}>Message</th>
              <th style={styles.tableHeaderCell}>Date</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message._id} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  {getStatusBadge(message.status)}
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.nameCell}>
                    <span style={styles.nameText}>{message.name}</span>
                    {message.status === 'new' && (
                      <span style={styles.newIndicator}>●</span>
                    )}
                  </div>
                </td>
                <td style={styles.tableCell}>{message.email}</td>
                <td style={styles.tableCell}>
                  <span style={styles.subjectText}>
                    {getSubjectDisplay(message.subject)}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.messagePreview}>
                    {message.message.substring(0, 50)}
                    {message.message.length > 50 && '...'}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.dateCell}>
                    {formatDate(message.submittedAt)}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <button
                    style={styles.viewButton}
                    onClick={() => openMessageModal(message)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {messages.length === 0 && !loading && (
          <div style={styles.noMessages}>
            <div style={styles.noMessagesIcon}>💬</div>
            <div style={styles.noMessagesText}>No contact messages found</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <span style={styles.paginationInfo}>
            Page {currentPage} of {pagination.pages} ({pagination.total} messages)
          </span>
          
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === pagination.pages ? styles.paginationButtonDisabled : {})
            }}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.pages}
          >
            Next
          </button>
        </div>
      )}

      {/* Message Modal */}
      {modalOpen && selectedMessage && (
        <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Contact Message Details</h3>
              <button
                style={styles.modalClose}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Status:</label>
                <div>{getStatusBadge(selectedMessage.status)}</div>
              </div>
              
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Name:</label>
                <span>{selectedMessage.name}</span>
              </div>
              
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Email:</label>
                <span>{selectedMessage.email}</span>
              </div>
              
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Subject:</label>
                <span>{getSubjectDisplay(selectedMessage.subject)}</span>
              </div>
              
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Submitted:</label>
                <span>{formatDate(selectedMessage.submittedAt)}</span>
              </div>
              
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Message:</label>
                <div style={styles.messageText}>{selectedMessage.message}</div>
              </div>
              
              {selectedMessage.adminNotes && (
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Admin Notes:</label>
                  <div style={styles.adminNotes}>{selectedMessage.adminNotes}</div>
                </div>
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button
                style={styles.actionButton}
                onClick={() => updateMessageStatus(selectedMessage._id, 'replied')}
              >
                Mark as Replied
              </button>
              <button
                style={styles.actionButton}
                onClick={() => updateMessageStatus(selectedMessage._id, 'resolved')}
              >
                Mark as Resolved
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
    maxWidth: '1200px',
    margin: '0 auto'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  
  summary: {
    display: 'flex',
    gap: '24px'
  },
  
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  
  summaryLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  
  summaryValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937'
  },
  
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  
  filterButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  filterButtonActive: {
    background: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6'
  },
  
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px'
  },
  
  loadingText: {
    color: '#6b7280',
    fontSize: '16px'
  },
  
  error: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    marginBottom: '24px'
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  
  tableHeader: {
    backgroundColor: '#f9fafb'
  },
  
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb'
  },
  
  tableRow: {
    borderBottom: '1px solid #f3f4f6'
  },
  
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1f2937',
    borderBottom: '1px solid #f3f4f6'
  },
  
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  nameText: {
    fontWeight: '500'
  },
  
  newIndicator: {
    color: '#3b82f6',
    fontSize: '8px'
  },
  
  subjectText: {
    fontWeight: '500'
  },
  
  messagePreview: {
    color: '#6b7280',
    fontSize: '13px'
  },
  
  dateCell: {
    fontSize: '12px',
    color: '#6b7280'
  },
  
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  
  badge: {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '500',
    borderRadius: '12px',
    textAlign: 'center',
    minWidth: '60px'
  },
  
  noMessages: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 24px',
    color: '#6b7280'
  },
  
  noMessagesIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  
  noMessagesText: {
    fontSize: '16px',
    fontWeight: '500'
  },
  
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0'
  },
  
  paginationButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '14px'
  },
  
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  
  paginationInfo: {
    color: '#6b7280',
    fontSize: '14px'
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  modalBody: {
    padding: '24px',
    overflow: 'auto',
    flex: 1
  },
  
  modalField: {
    marginBottom: '16px'
  },
  
  modalLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  },
  
  messageText: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.5'
  },
  
  adminNotes: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    border: '1px solid #fcd34d',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.5'
  },
  
  modalActions: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'flex-end'
  },
  
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default ContactMessages;