import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG, buildApiUrl } from '../../config/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 20
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.currentPage, searchTerm, roleFilter, activeFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        role: roleFilter,
        isActive: activeFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.USERS}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data.users);
      setPagination(data.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action, userId, additionalData = {}) => {
    try {
      let response;

      switch (action) {
        case 'toggleStatus':
          response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.USERS}/${userId}/toggle-status`, {
            method: 'PATCH'
          });
          break;

        case 'delete':
          if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
          }
          response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.USERS}/${userId}`, {
            method: 'DELETE'
          });
          break;

        case 'resetPassword':
          const newPassword = prompt('Enter new password (min 8 characters):');
          if (!newPassword || newPassword.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
          }
          response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.USERS}/${userId}/reset-password`, {
            method: 'PATCH',
            body: JSON.stringify({ newPassword })
          });
          break;

        case 'update':
          response = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.USERS}/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(additionalData)
          });
          break;

        case 'create':
          response = await makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ADMIN.USERS, {
            method: 'POST',
            body: JSON.stringify(additionalData)
          });
          break;

        default:
          throw new Error('Unknown action');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operation failed');
      }

      const result = await response.json();
      alert(result.message || 'Operation completed successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleBulkOperation = async (operation) => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${operation} ${selectedUsers.length} user(s)?`)) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ADMIN.BULK_OPERATIONS, {
        method: 'POST',
        body: JSON.stringify({
          operation,
          userIds: selectedUsers
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk operation failed');
      }

      const result = await response.json();
      alert(result.message);
      setSelectedUsers([]);
      fetchUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'moderator': return '#d97706';
      default: return '#059669';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#10b981' : '#6b7280';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>User Management</h1>
        <button 
          style={styles.createButton}
          onClick={() => setShowCreateModal(true)}
        >
          + Create User
        </button>
      </div>

      {/* Filters and Search */}
      <div style={styles.filtersContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by name or email..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={styles.filters}>
          <select 
            style={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>

          <select 
            style={styles.filterSelect}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div style={styles.bulkActions}>
          <span style={styles.bulkText}>{selectedUsers.length} user(s) selected</span>
          <div style={styles.bulkButtons}>
            <button 
              style={{...styles.bulkButton, backgroundColor: '#10b981'}}
              onClick={() => handleBulkOperation('activate')}
            >
              Activate
            </button>
            <button 
              style={{...styles.bulkButton, backgroundColor: '#f59e0b'}}
              onClick={() => handleBulkOperation('deactivate')}
            >
              Deactivate
            </button>
            <button 
              style={{...styles.bulkButton, backgroundColor: '#ef4444'}}
              onClick={() => handleBulkOperation('delete')}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
                <input 
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(users.map(u => u._id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                />
              </th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Verified</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Last Login</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id} style={styles.tr}>
                <td style={styles.td}>
                  <input 
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user._id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                      }
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.contactInfo}>
                    {user.phone && (
                      <div style={styles.phoneNumber}>
                        📱 {user.phone}
                      </div>
                    )}
                    {user.bio && (
                      <div style={styles.userBio} title={user.bio}>
                        💬 {user.bio.length > 30 ? user.bio.substring(0, 30) + '...' : user.bio}
                      </div>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.companyInfo}>
                    {user.company && (
                      <div style={styles.companyName}>
                        🏢 {user.company}
                      </div>
                    )}
                    {user.position && (
                      <div style={styles.userPosition}>
                        💼 {user.position}
                      </div>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.roleBadge,
                    backgroundColor: getRoleColor(user.role),
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(user.isActive),
                  }}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.emailVerified ? '✅' : '❌'}
                </td>
                <td style={styles.td}>
                  {formatDate(user.createdAt)}
                </td>
                <td style={styles.td}>
                  {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button 
                      style={styles.actionButton}
                      onClick={() => alert(`User Details:\n\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nPhone: ${user.phone || 'Not provided'}\nCompany: ${user.company || 'Not provided'}\nPosition: ${user.position || 'Not provided'}\nBio: ${user.bio || 'Not provided'}\nRole: ${user.role}\nStatus: ${user.isActive ? 'Active' : 'Inactive'}\nEmail Verified: ${user.emailVerified ? 'Yes' : 'No'}\nJoined: ${formatDate(user.createdAt)}\nLast Login: ${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}`)}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button 
                      style={styles.actionButton}
                      onClick={() => {
                        setEditingUser(user);
                        setShowEditModal(true);
                      }}
                      title="Edit User"
                    >
                      ✏️
                    </button>
                    <button 
                      style={styles.actionButton}
                      onClick={() => handleUserAction('toggleStatus', user._id)}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? '🔴' : '🟢'}
                    </button>
                    <button 
                      style={styles.actionButton}
                      onClick={() => handleUserAction('resetPassword', user._id)}
                      title="Reset Password"
                    >
                      🔑
                    </button>
                    <button 
                      style={{...styles.actionButton, color: '#ef4444'}}
                      onClick={() => handleUserAction('delete', user._id)}
                      title="Delete User"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <div style={styles.paginationInfo}>
          Showing {users.length} of {pagination.totalUsers} users
        </div>
        <div style={styles.paginationButtons}>
          <button 
            style={styles.pageButton}
            disabled={pagination.currentPage === 1}
            onClick={() => setPagination(prev => ({...prev, currentPage: prev.currentPage - 1}))}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button 
            style={styles.pageButton}
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => setPagination(prev => ({...prev, currentPage: prev.currentPage + 1}))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)}
          onSave={(userData) => {
            handleUserAction('create', null, userData);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal 
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSave={(userData) => {
            handleUserAction('update', editingUser._id, userData);
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

// Create User Modal Component
const CreateUserModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      alert('Email and password are required');
      return;
    }
    onSave(formData);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2>Create New User</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input 
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password *</label>
            <input 
              type="password"
              style={styles.input}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              minLength={8}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>First Name</label>
              <input 
                type="text"
                style={styles.input}
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Last Name</label>
              <input 
                type="text"
                style={styles.input}
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select 
              style={styles.input}
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.saveButton}>
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit User Modal Component
const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    bio: user.bio || '',
    company: user.company || '',
    position: user.position || '',
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2>Edit User: {user.email}</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>First Name</label>
              <input 
                type="text"
                style={styles.input}
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Last Name</label>
              <input 
                type="text"
                style={styles.input}
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input 
                type="tel"
                style={styles.input}
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Company</label>
              <input 
                type="text"
                style={styles.input}
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                placeholder="Company Name"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Position</label>
            <input 
              type="text"
              style={styles.input}
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              placeholder="Job Title"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Bio</label>
            <textarea 
              style={{...styles.input, minHeight: '60px', resize: 'vertical'}}
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Brief description..."
              maxLength={500}
            />
            <div style={{fontSize: '12px', color: '#6b7280', textAlign: 'right', marginTop: '4px'}}>
              {formData.bio.length}/500 characters
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select 
              style={styles.input}
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              />
              Account Active
            </label>

            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox"
                checked={formData.emailVerified}
                onChange={(e) => setFormData({...formData, emailVerified: e.target.checked})}
              />
              Email Verified
            </label>
          </div>

          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.saveButton}>
              Save Changes
            </button>
          </div>
        </form>
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

  createButton: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },

  filtersContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
  },

  searchContainer: {
    flex: 1,
    maxWidth: '400px',
  },

  searchInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  filters: {
    display: 'flex',
    gap: '12px',
  },

  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    minWidth: '120px',
  },

  bulkActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    marginBottom: '24px',
  },

  bulkText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
  },

  bulkButtons: {
    display: 'flex',
    gap: '8px',
  },

  bulkButton: {
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },

  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    marginBottom: '24px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  th: {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },

  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },

  td: {
    padding: '16px 12px',
    fontSize: '14px',
    color: '#1f2937',
  },

  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },

  userName: {
    fontWeight: '600',
    marginBottom: '2px',
  },

  userEmail: {
    fontSize: '12px',
    color: '#6b7280',
  },

  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  phoneNumber: {
    fontSize: '12px',
    color: '#374151',
  },

  userBio: {
    fontSize: '11px',
    color: '#6b7280',
    fontStyle: 'italic',
  },

  companyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  companyName: {
    fontSize: '12px',
    color: '#374151',
    fontWeight: '500',
  },

  userPosition: {
    fontSize: '11px',
    color: '#6b7280',
  },

  roleBadge: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
  },

  statusBadge: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
  },

  actions: {
    display: 'flex',
    gap: '8px',
  },

  actionButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },

  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },

  paginationInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },

  paginationButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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

  // Modal Styles
  modalOverlay: {
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

  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '0',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },

  form: {
    padding: '24px',
  },

  formGroup: {
    marginBottom: '16px',
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },

  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },

  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  },

  cancelButton: {
    padding: '10px 20px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },

  saveButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default UserManagement;