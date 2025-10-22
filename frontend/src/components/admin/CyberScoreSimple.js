import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';

const CyberScoreSimple = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadSimpleData();
  }, []);

  const loadSimpleData = async () => {
    console.log('🔧 Simple CyberScore component loading...');
    setLoading(true);
    setError(null);

    try {
      // Test the health endpoint first
      console.log('Testing health endpoint...');
      const healthResponse = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.BASE}/health`);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Health check passed:', healthData);
        
        // Try to get reviews
        console.log('Testing reviews endpoint...');
        const reviewsResponse = await makeAuthenticatedRequest(`${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/reviews?page=1&limit=5`);
        
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          console.log('✅ Reviews loaded:', reviewsData);
          setData({ health: healthData, reviews: reviewsData });
        } else {
          console.log('⚠️ Reviews failed, but health passed');
          setData({ health: healthData, reviews: null, reviewsError: reviewsResponse.status });
        }
      } else {
        console.log('❌ Health check failed:', healthResponse.status);
        setError(`Health check failed: ${healthResponse.status}`);
      }
    } catch (err) {
      console.error('💥 Error in loadSimpleData:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
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
    error: {
      textAlign: 'center',
      fontSize: '18px',
      color: '#ef4444',
      padding: '40px',
      backgroundColor: '#fef2f2',
      borderRadius: '8px',
      border: '1px solid #fecaca',
    },
    success: {
      padding: '20px',
      backgroundColor: '#f0f9ff',
      borderRadius: '8px',
      border: '1px solid #bae6fd',
    },
    dataSection: {
      margin: '20px 0',
      padding: '16px',
      backgroundColor: '#f8fafc',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      margin: '10px 0',
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Cyber Score Management (Simple)</h2>
          <p style={styles.subtitle}>Testing connection and basic functionality</p>
        </div>
        <div style={styles.loading}>
          ⏳ Loading... (this should complete quickly)
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Cyber Score Management (Simple)</h2>
          <p style={styles.subtitle}>Testing connection and basic functionality</p>
        </div>
        <div style={styles.error}>
          <h3>❌ Error Occurred</h3>
          <p>{error}</p>
          <button style={styles.button} onClick={loadSimpleData}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Cyber Score Management (Simple)</h2>
        <p style={styles.subtitle}>✅ Basic functionality test successful!</p>
      </div>

      <div style={styles.success}>
        <h3>🎉 Connection Test Results</h3>
        <p>The cyber score system is responding correctly.</p>
        
        <button style={styles.button} onClick={loadSimpleData}>
          🔄 Refresh Test
        </button>
      </div>

      {data && (
        <div>
          <div style={styles.dataSection}>
            <h4>🏥 Health Check</h4>
            <p>Status: {data.health?.success ? '✅ Healthy' : '❌ Unhealthy'}</p>
            <p>User: {data.health?.user?.email || 'Unknown'}</p>
            <p>Role: {data.health?.user?.role || 'Unknown'}</p>
          </div>

          <div style={styles.dataSection}>
            <h4>📊 Reviews Test</h4>
            {data.reviews ? (
              <div>
                <p>✅ Reviews endpoint working</p>
                <p>Found: {data.reviews.data?.reviews?.length || 0} reviews</p>
                <p>Total: {data.reviews.data?.pagination?.totalReviews || 0} total reviews</p>
              </div>
            ) : (
              <div>
                <p>⚠️ Reviews endpoint returned error: {data.reviewsError}</p>
                <p>This might be normal if no cyber score data exists yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.dataSection}>
        <h4>🛠️ Next Steps</h4>
        <p>If this simple test works, the issue is likely in the complex CyberScoreManagement component.</p>
        <p>You can:</p>
        <ul>
          <li>Go back to the main Cyber Score Management section</li>
          <li>Use the "CyberScore Debug" option to see detailed diagnostics</li>
          <li>Check the browser console for any JavaScript errors</li>
        </ul>
      </div>
    </div>
  );
};

export default CyberScoreSimple;