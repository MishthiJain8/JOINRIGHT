import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG, buildApiUrl } from '../../config/api';

const CyberScoreManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [editingScore, setEditingScore] = useState(null);
  const [newScore, setNewScore] = useState('');
  const [scoreReason, setScoreReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'users'
  const [allUserScores, setAllUserScores] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  
  // Simple cache for API responses
  const [dataCache, setDataCache] = useState(new Map());
  const [lastCacheUpdate, setLastCacheUpdate] = useState(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Cache helper functions
  const getCacheKey = (endpoint, params = {}) => {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  };
  
  const getFromCache = (key) => {
    const now = Date.now();
    if (now - lastCacheUpdate > CACHE_DURATION) {
      setDataCache(new Map()); // Clear expired cache
      setLastCacheUpdate(now);
      return null;
    }
    return dataCache.get(key);
  };
  
  const setToCache = (key, data) => {
    const newCache = new Map(dataCache);
    newCache.set(key, { data, timestamp: Date.now() });
    setDataCache(newCache);
  };
  
  const makeCachedRequest = async (url, options = {}, cacheKey = null, forceRefresh = false) => {
    const key = cacheKey || getCacheKey(url);
    
    // Check cache first (skip if force refresh)
    if (!forceRefresh) {
      const cached = getFromCache(key);
      if (cached) {
        console.log('Using cached data for:', key);
        return { ok: true, json: () => Promise.resolve(cached.data) };
      }
    }
    
    try {
      // Make actual request
      console.log('Making fresh request for:', key);
      const response = await makeAuthenticatedRequest(url, options);
      
      // Cache successful responses
      if (response.ok) {
        const data = await response.clone().json();
        setToCache(key, data);
      }
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      // Return a mock response for network errors
      return {
        ok: false,
        status: 500,
        statusText: 'Network Error',
        json: () => Promise.resolve({ error: error.message })
      };
    }
  };

  useEffect(() => {
    loadData();
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached, clearing loading state');
        setLoading(false);
        setError('Loading timed out. Please check your connection and try refreshing the page.');
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [currentPage, selectedUser, loading]);

  const loadData = async (isManualRefresh = false) => {
    console.log('🚀 CyberScore loadData called:', { isManualRefresh, loading, currentPage, selectedUser });
    
    // Prevent multiple simultaneous requests
    if (loading && !isManualRefresh) {
      console.log('Request already in progress, skipping...');
      return;
    }
    
    // Debounce rapid refresh attempts (minimum 1 second between refreshes)
    const now = Date.now();
    if (isManualRefresh && (now - lastRefreshTime) < 1000) {
      console.log('Refresh too soon, please wait...');
      return;
    }
    
    if (isManualRefresh) {
      setIsRefreshing(true);
      setLastRefreshTime(now);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading cyber score data...', { page: currentPage, selectedUser, isManualRefresh });
      
      // Load reviews with enhanced error handling
      const reviewsParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(selectedUser && { userId: selectedUser })
      });

      const reviewsUrl = `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/reviews?${reviewsParams}`;
      console.log('Fetching reviews from:', reviewsUrl);
      
      const reviewsResponse = await makeCachedRequest(reviewsUrl, {}, null, isManualRefresh);
      
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        console.log('Reviews loaded successfully:', {
          count: reviewsData.data?.reviews?.length || 0,
          totalPages: reviewsData.data?.pagination?.totalPages || 1,
          page: currentPage
        });
        setReviews(reviewsData.data?.reviews || []);
        setTotalPages(reviewsData.data?.pagination?.totalPages || 1);
      } else {
        let errorMessage = `HTTP ${reviewsResponse.status}: ${reviewsResponse.statusText}`;
        try {
          const errorData = await reviewsResponse.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Reviews API error:', errorData);
        } catch (parseErr) {
          console.error('Could not parse error response:', parseErr);
        }
        
        // Handle authentication errors differently
        if (reviewsResponse.status === 401) {
          setError('Authentication required. Please log in again.');
          // Clear loading state even on auth error
          setLoading(false);
          return;
        } else {
          setError(`Failed to load reviews: ${errorMessage}`);
          // Don't return early for other errors, continue loading users
          console.warn('Reviews failed, but continuing with user data loading...');
        }
      }

      // Load users optimized - use bulk endpoint if available
      if (users.length === 0) {
        console.log('Loading users list...');
        try {
          // Try bulk endpoint first for better performance
          const bulkResponse = await makeCachedRequest(
            `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/bulk?limit=1000`,
            {},
            'bulk-cyber-scores',
            isManualRefresh
          );
          
          if (bulkResponse.ok) {
            const bulkData = await bulkResponse.json();
            console.log('Bulk user scores loaded:', bulkData.data?.userScores?.length || 0);
            
            // Extract users and scores from bulk data
            const usersFromBulk = bulkData.data?.userScores?.map(item => item.user) || [];
            const scoresFromBulk = bulkData.data?.userScores?.map(item => ({
              user: item.user,
              cyberScore: {
                currentScore: item.currentScore,
                reputationLevel: item.reputationLevel,
                meetingStats: item.meetingStats,
                restrictions: { temporaryBan: { isActive: item.restrictions?.temporaryBan?.isActive || false } },
                scoreHistory: new Array(item.scoreHistoryCount || 0) // Placeholder array for count
              }
            })) || [];
            
            setUsers(usersFromBulk);
            setAllUserScores(scoresFromBulk);
          } else {
            // Fallback to individual user loading
            throw new Error('Bulk endpoint failed, falling back to individual loading');
          }
        } catch (bulkErr) {
          console.warn('Bulk loading failed, using fallback method:', bulkErr.message);
          
          // Fallback: Load users individually (less efficient but more reliable)
          const usersResponse = await makeCachedRequest(
            `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users?limit=100`, // Reduced limit for performance
            {},
            'users-list',
            isManualRefresh
          );
          
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            console.log('Users loaded via fallback:', usersData.data?.users?.length || 0);
            setUsers(usersData.data?.users || []);
            
            // Load cyber scores with error handling and concurrency limit
            const userList = (usersData.data?.users || []).slice(0, 50); // Limit to first 50 for performance
            console.log('Loading cyber scores for', userList.length, 'users...');
            
            const userScorePromises = userList.map(async (user) => {
              try {
                const scoreResponse = await makeAuthenticatedRequest(
                  `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/${user._id}`
                );
                if (scoreResponse.ok) {
                  const scoreData = await scoreResponse.json();
                  return {
                    user,
                    cyberScore: scoreData.data
                  };
                } else {
                  console.warn(`Failed to load score for user ${user._id}: HTTP ${scoreResponse.status}`);
                }
              } catch (err) {
                console.warn(`Error loading score for user ${user._id}:`, err.message);
              }
              return {
                user,
                cyberScore: null
              };
            });
            
            // Process in batches to avoid overwhelming the server
            const batchSize = 10;
            const userScores = [];
            for (let i = 0; i < userScorePromises.length; i += batchSize) {
              const batch = userScorePromises.slice(i, i + batchSize);
              const batchResults = await Promise.all(batch);
              userScores.push(...batchResults);
              console.log(`Loaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(userScorePromises.length/batchSize)}`);
            }
            
            console.log('Individual user scores loaded:', userScores.length);
            setAllUserScores(userScores);
          } else {
            const errorText = await usersResponse.text();
            console.error('Users fetch error:', errorText);
            setError(`Failed to load users: ${usersResponse.status}`);
          }
        }
      }
      
      console.log('Data loading completed successfully');
    } catch (err) {
      console.error('Critical error in loadData:', err);
      const errorMessage = err.message || 'Unknown error occurred';
      setError(`Failed to load data: ${errorMessage}. Please check your connection and try again.`);
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  const handleScoreUpdate = async (userId) => {
    if (!newScore || !scoreReason) {
      alert('Please provide both a new score and a reason');
      return;
    }

    const score = parseInt(newScore);
    if (score < 0 || score > 100) {
      alert('Score must be between 0 and 100');
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentScore: score,
            reason: scoreReason
          })
        }
      );

      if (response.ok) {
        setEditingScore(null);
        setNewScore('');
        setScoreReason('');
        loadData(); // Reload data to show updated scores
        alert('Cyber score updated successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to update score: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Score update error:', err);
      alert('Failed to update score');
    }
  };

  const handleDeleteReview = async (userId, reviewId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/${userId}/reviews/${reviewId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setDeleteConfirm(null);
        loadData(); // Reload data to show updated list
        alert('Review deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete review: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete review error:', err);
      alert('Failed to delete review');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#059669';
    if (score >= 50) return '#F59E0B';
    if (score >= 25) return '#EF4444';
    return '#7F1D1D';
  };

  const getIncidentTypeColor = (type) => {
    switch (type) {
      case 'positive': return '#10B981';
      case 'neutral': return '#6B7280';
      case 'minor_violation': return '#F59E0B';
      case 'major_violation': return '#EF4444';
      case 'severe_violation': return '#7F1D1D';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}>⏳</div>
          <div>Loading cyber score data...</div>
          <div style={styles.loadingSubtext}>
            {isRefreshing ? 'Refreshing...' : 'Please wait while we fetch the data'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Cyber Score Management</h2>
          <p style={styles.subtitle}>Manage user cyber scores, review comments, and delete inappropriate reviews</p>
        </div>
        
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorContent}>
            <h3 style={styles.errorTitle}>Unable to Load Data</h3>
            <div style={styles.error}>{error}</div>
            <div style={styles.errorActions}>
              <button 
                style={styles.retryButton}
                onClick={() => {
                  setError(null);
                  loadData(true);
                }}
              >
                🔄 Retry Loading
              </button>
              <button 
                style={styles.debugButton}
                onClick={() => window.open('/admin#cyber-scores-debug', '_blank')}
              >
                🐛 Open Debug View
              </button>
            </div>
          </div>
        </div>
        
        {/* Show basic interface even when errored */}
        <div style={styles.fallbackContent}>
          <div style={styles.fallbackMessage}>
            <h4>What you can try:</h4>
            <ul>
              <li>Check if you're properly logged in as an administrator</li>
              <li>Refresh the page and try again</li>
              <li>Clear your browser cache and cookies</li>
              <li>Contact system administrator if the issue persists</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Cyber Score Management</h2>
        <p style={styles.subtitle}>
          Manage user cyber scores, review comments, and delete inappropriate reviews
        </p>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by User:</label>
          <select 
            style={styles.filterSelect}
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
        </div>
        <button 
          style={{
            ...styles.refreshButton,
            opacity: isRefreshing ? 0.6 : 1,
            cursor: isRefreshing ? 'not-allowed' : 'pointer'
          }}
          onClick={() => {
            if (!isRefreshing) {
              loadData(true);
            }
          }}
          disabled={isRefreshing}
        >
          {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'reviews' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('reviews')}
        >
          📜 Reviews & Comments ({reviews.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'users' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('users')}
        >
          👥 All User Scores ({allUserScores.length})
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'reviews' ? (
        /* Reviews Table */
      <div style={styles.tableContainer}>
        {reviews.length === 0 ? (
          <div style={styles.noDataContainer}>
            <div style={styles.noDataIcon}>📊</div>
            <h3 style={styles.noDataTitle}>No Reviews Found</h3>
            <p style={styles.noDataText}>
              {selectedUser ? 
                'This user has no cyber score reviews yet.' : 
                'No cyber score reviews exist in the system yet.'}
            </p>
            <button 
              style={styles.createTestDataButton}
              onClick={() => {
                alert('To see data here, users need to participate in meetings and receive ratings from hosts.');
              }}
            >
              ℹ️ How to Generate Data
            </button>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Current Score</th>
                <th style={styles.th}>Review Details</th>
                <th style={styles.th}>Host</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((item, index) => {
                console.log('Review item:', item); // Debug log
                return (
                  <tr key={index} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={styles.userInfo}>
                        <div style={styles.userName}>
                          {/* Handle both array and object formats */}
                          {Array.isArray(item.user) 
                            ? (item.user[0]?.firstName || 'Unknown') + ' ' + (item.user[0]?.lastName || 'User')
                            : (item.user?.firstName || 'Unknown') + ' ' + (item.user?.lastName || 'User')
                          }
                        </div>
                        <div style={styles.userEmail}>
                          {Array.isArray(item.user) 
                            ? (item.user[0]?.email || 'No email')
                            : (item.user?.email || 'No email')
                          }
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.scoreContainer}>
                        <div 
                          style={{
                            ...styles.scoreBadge,
                            backgroundColor: getScoreColor(item.currentScore || 85)
                          }}
                        >
                          {item.currentScore || 85}
                        </div>
                        <div style={styles.reputationLevel}>
                          {item.reputationLevel || 'average'}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.reviewDetails}>
                        <div style={styles.reviewReason}>
                          {item.review?.reason || 'No reason provided'}
                        </div>
                        <div style={styles.reviewMeta}>
                          <span 
                            style={{
                              ...styles.incidentType,
                              color: getIncidentTypeColor(item.review?.incidentType || 'neutral')
                            }}
                          >
                            {item.review?.incidentType || 'neutral'}
                          </span>
                          <span style={styles.scoreChange}>
                            {item.review?.scoreChange > 0 ? '+' : ''}{item.review?.scoreChange || 0} pts
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.hostInfo}>
                        {(item.host && ((Array.isArray(item.host) && item.host.length > 0) || !Array.isArray(item.host))) ? (
                          <>
                            <div>
                              {Array.isArray(item.host) 
                                ? (item.host[0]?.firstName || 'Unknown') + ' ' + (item.host[0]?.lastName || 'Host')
                                : (item.host?.firstName || 'Unknown') + ' ' + (item.host?.lastName || 'Host')
                              }
                            </div>
                            <div style={styles.hostEmail}>
                              {Array.isArray(item.host) 
                                ? (item.host[0]?.email || 'No email')
                                : (item.host?.email || 'No email')
                              }
                            </div>
                          </>
                        ) : (
                          <span style={styles.noHost}>No host info</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.dateContainer}>
                        {item.review?.timestamp ? formatDate(item.review.timestamp) : 'No date'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.editButton}
                          onClick={() => {
                            setEditingScore(item.userId);
                            setNewScore((item.currentScore || 85).toString());
                            setScoreReason('');
                          }}
                        >
                          ✏️ Edit Score
                        </button>
                        {item.review?._id && (
                          <button
                            style={styles.deleteButton}
                            onClick={() => setDeleteConfirm({ 
                              userId: item.userId, 
                              reviewId: item.review._id,
                              reason: item.review.reason || 'No reason provided'
                            })}
                          >
                            🗑️ Delete Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      ) : (
        /* All Users with Scores */
        <div style={styles.tableContainer}>
          {allUserScores.length === 0 ? (
            <div style={styles.noDataContainer}>
              <div style={styles.noDataIcon}>👥</div>
              <h3 style={styles.noDataTitle}>Loading User Scores...</h3>
              <p style={styles.noDataText}>Please wait while we fetch all user cyber scores.</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Current Score</th>
                  <th style={styles.th}>Reputation Level</th>
                  <th style={styles.th}>Meeting Stats</th>
                  <th style={styles.th}>Review Summary</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUserScores.map((userScore, index) => {
                  const score = userScore.cyberScore?.currentScore || 85;
                  const level = userScore.cyberScore?.reputationLevel || 'average';
                  const stats = userScore.cyberScore?.meetingStats || {};
                  
                  return (
                    <tr key={index} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <div style={styles.userName}>
                            {userScore.user.firstName || 'Unknown'} {userScore.user.lastName || 'User'}
                          </div>
                          <div style={styles.userEmail}>{userScore.user.email}</div>
                          <div style={styles.userMeta}>
                            ID: {userScore.user._id.slice(-6)}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.scoreContainer}>
                          <div 
                            style={{
                              ...styles.scoreBadge,
                              backgroundColor: getScoreColor(score)
                            }}
                          >
                            {score}
                          </div>
                          <div style={styles.reputationLevel}>
                            {level}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.reputationInfo}>
                          <div style={{
                            ...styles.reputationBadge,
                            backgroundColor: getScoreColor(score)
                          }}>
                            {level.toUpperCase()}
                          </div>
                          {userScore.cyberScore?.restrictions?.temporaryBan?.isActive && (
                            <div style={styles.bannedIndicator}>
                              🚫 BANNED
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.meetingStats}>
                          <div>🏁 Meetings: {stats.totalMeetingsAttended || 0}</div>
                          <div>🙋 Kicked: {stats.meetingsKickedFrom || 0}</div>
                          <div>🚫 Banned: {stats.meetingsBanned || 0}</div>
                          <div>⏱️ Avg Stay: {Math.round(stats.averageStayDuration || 0)}min</div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.reviewSummary}>
                          <div style={styles.positiveReviews}>
                            ⬆️ {stats.positiveReviews || 0} positive
                          </div>
                          <div style={styles.negativeReviews}>
                            ⬇️ {stats.negativeReviews || 0} negative
                          </div>
                          <div style={styles.totalReviews}>
                            Total: {userScore.cyberScore?.scoreHistory?.length || 0} reviews
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            style={styles.editButton}
                            onClick={() => {
                              setEditingScore(userScore.user._id);
                              setNewScore(score.toString());
                              setScoreReason('');
                            }}
                          >
                            ✏️ Edit Score
                          </button>
                          <button
                            style={styles.viewButton}
                            onClick={() => {
                              setSelectedUser(userScore.user._id);
                              setActiveTab('reviews');
                            }}
                          >
                            🔍 View Reviews
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === 1 ? styles.pageButtonDisabled : {})
            }}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
            }}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Score Modal */}
      {editingScore && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Edit Cyber Score</h3>
            <div style={styles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>New Score (0-100):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  style={styles.input}
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Reason for change:</label>
                <textarea
                  style={styles.textarea}
                  rows="3"
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  placeholder="Explain why you're changing this user's score..."
                />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setEditingScore(null);
                  setNewScore('');
                  setScoreReason('');
                }}
              >
                Cancel
              </button>
              <button
                style={styles.confirmButton}
                onClick={() => handleScoreUpdate(editingScore)}
              >
                Update Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Confirm Delete Review</h3>
            <div style={styles.modalBody}>
              <p>Are you sure you want to delete this review?</p>
              <div style={styles.deletePreview}>
                <strong>Review:</strong> {deleteConfirm.reason}
              </div>
              <p style={styles.warningText}>
                This action will remove the review from the user's history and adjust their score accordingly.
              </p>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                style={styles.deleteConfirmButton}
                onClick={() => handleDeleteReview(deleteConfirm.userId, deleteConfirm.reviewId)}
              >
                Delete Review
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  
  loadingSpinner: {
    fontSize: '32px',
    animation: 'spin 2s linear infinite',
  },
  
  loadingSubtext: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  
  error: {
    fontSize: '16px',
    color: '#ef4444',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    marginBottom: '16px',
  },
  
  errorContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '24px',
    backgroundColor: '#fefefe',
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
    marginBottom: '24px',
  },
  
  errorIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  
  errorContent: {
    flex: 1,
  },
  
  errorTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  
  errorActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  debugButton: {
    padding: '10px 20px',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  fallbackContent: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  
  fallbackMessage: {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    fontSize: '14px',
    minWidth: '250px',
    color: '#111827',
    fontWeight: '500',
    outline: 'none',
    cursor: 'pointer',
  },
  
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #d1d5db',
  },
  
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
  },
  
  td: {
    padding: '16px',
    verticalAlign: 'top',
  },
  
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '2px',
  },
  
  userEmail: {
    fontSize: '12px',
    color: '#374151',
    fontWeight: '500',
  },
  
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  
  scoreBadge: {
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    minWidth: '40px',
    textAlign: 'center',
  },
  
  reputationLevel: {
    fontSize: '11px',
    color: '#374151',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  
  reviewDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  
  reviewReason: {
    fontSize: '14px',
    color: '#111827',
    lineHeight: '1.4',
    fontWeight: '500',
    marginBottom: '4px',
  },
  
  reviewMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
  },
  
  incidentType: {
    fontWeight: '600',
    textTransform: 'capitalize',
    fontSize: '12px',
  },
  
  scoreChange: {
    color: '#374151',
    fontWeight: '600',
    fontSize: '12px',
  },
  
  hostInfo: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: '500',
  },
  
  hostEmail: {
    fontSize: '11px',
    color: '#374151',
    marginTop: '2px',
    fontWeight: '500',
  },
  
  noHost: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  
  dateContainer: {
    fontSize: '12px',
    color: '#374151',
    fontWeight: '500',
  },
  
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
  },
  
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  
  pageButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
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
  },
  
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
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
    cursor: 'pointer',
  },
  
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  
  deleteConfirmButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  
  deletePreview: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    marginBottom: '12px',
    fontSize: '14px',
  },
  
  warningText: {
    fontSize: '12px',
    color: '#dc2626',
    fontStyle: 'italic',
  },
  
  noDataContainer: {
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: '#fafafa',
  },
  
  noDataIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: '0.5',
  },
  
  noDataTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  
  noDataText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  
  createTestDataButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px',
    backgroundColor: '#fff',
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden',
  },
  
  tab: {
    padding: '16px 24px',
    border: 'none',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s',
    borderBottom: '3px solid transparent',
  },
  
  activeTab: {
    backgroundColor: '#fff',
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  
  userMeta: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
    fontWeight: '500',
  },
  
  reputationInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  
  reputationBadge: {
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  bannedIndicator: {
    color: '#dc2626',
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#fef2f2',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid #fecaca',
  },
  
  meetingStats: {
    fontSize: '12px',
    color: '#111827',
    lineHeight: '1.4',
    fontWeight: '500',
  },
  
  reviewSummary: {
    fontSize: '12px',
    color: '#111827',
    lineHeight: '1.4',
    fontWeight: '500',
  },
  
  positiveReviews: {
    color: '#16a34a',
  },
  
  negativeReviews: {
    color: '#dc2626',
  },
  
  totalReviews: {
    color: '#374151',
    marginTop: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};


export default CyberScoreManagement;
