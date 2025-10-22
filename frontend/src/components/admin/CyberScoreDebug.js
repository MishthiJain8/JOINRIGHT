import React, { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, API_CONFIG } from '../../config/api';

const CyberScoreDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    loading: true,
    authToken: null,
    apiResults: [],
    errors: []
  });

  useEffect(() => {
    runDebugTests();
  }, []);

  const addResult = (test, result) => {
    setDebugInfo(prev => ({
      ...prev,
      apiResults: [...prev.apiResults, { test, result, timestamp: new Date().toLocaleTimeString() }]
    }));
  };

  const addError = (error) => {
    setDebugInfo(prev => ({
      ...prev,
      errors: [...prev.errors, { error: error.toString(), timestamp: new Date().toLocaleTimeString() }]
    }));
  };

  const runDebugTests = async () => {
    console.log('🐛 Starting CyberScore Debug Tests...');
    
    // Check authentication token
    const token = localStorage.getItem('authToken');
    setDebugInfo(prev => ({ ...prev, authToken: token ? 'Present' : 'Missing' }));
    
    if (!token) {
      addError(new Error('No authentication token found in localStorage'));
      setDebugInfo(prev => ({ ...prev, loading: false }));
      return;
    }
    
    const tests = [
      {
        name: 'Admin Health Check',
        url: `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/health`,
        expected: 'Should return 200 if authenticated'
      },
      {
        name: 'Cyber Score Reviews',
        url: `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/reviews?page=1&limit=5`,
        expected: 'Should return reviews array or empty array'
      },
      {
        name: 'Bulk User Scores (new)',
        url: `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/cyber-scores/bulk?limit=10`,
        expected: 'Should return user scores array'
      },
      {
        name: 'Users List',
        url: `${API_CONFIG.ENDPOINTS.ADMIN.BASE}/users?limit=5`,
        expected: 'Should return users array'
      }
    ];
    
    for (const test of tests) {
      try {
        console.log(`Testing: ${test.name}`);
        const startTime = Date.now();
        const response = await makeAuthenticatedRequest(test.url);
        const duration = Date.now() - startTime;
        
        const result = {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          success: response.ok
        };
        
        if (response.ok) {
          const data = await response.json();
          result.dataType = typeof data;
          result.hasData = !!data.data;
          result.dataKeys = data.data ? Object.keys(data.data) : [];
          result.message = data.success ? 'API call successful' : 'API returned error';
        } else {
          try {
            const errorData = await response.json();
            result.error = errorData.error || 'Unknown error';
          } catch {
            result.error = `HTTP ${response.status}`;
          }
        }
        
        addResult(test, result);
        
      } catch (error) {
        console.error(`Test failed: ${test.name}`, error);
        addResult(test, {
          success: false,
          error: error.message,
          type: 'Network/Fetch Error'
        });
        addError(error);
      }
    }
    
    setDebugInfo(prev => ({ ...prev, loading: false }));
    console.log('🐛 Debug tests completed');
  };

  const debugStyles = {
    container: {
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      margin: '20px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#333',
    },
    section: {
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#fff',
      borderRadius: '6px',
      border: '1px solid #ddd',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#555',
    },
    result: {
      padding: '10px',
      margin: '5px 0',
      borderRadius: '4px',
      fontSize: '14px',
    },
    success: {
      backgroundColor: '#d4edda',
      border: '1px solid #c3e6cb',
      color: '#155724',
    },
    error: {
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      color: '#721c24',
    },
    info: {
      backgroundColor: '#d1ecf1',
      border: '1px solid #bee5eb',
      color: '#0c5460',
    },
    code: {
      backgroundColor: '#f8f9fa',
      padding: '2px 4px',
      borderRadius: '3px',
      fontFamily: 'monospace',
      fontSize: '12px',
    }
  };

  return (
    <div style={debugStyles.container}>
      <div style={debugStyles.title}>🐛 CyberScore Management Debug</div>
      
      <div style={debugStyles.section}>
        <div style={debugStyles.sectionTitle}>Authentication Status</div>
        <div style={debugStyles.result}>
          Token Status: <span style={debugStyles.code}>{debugInfo.authToken}</span>
        </div>
      </div>
      
      {debugInfo.loading && (
        <div style={debugStyles.section}>
          <div style={debugStyles.sectionTitle}>Running Tests...</div>
          <div>⏳ Testing API endpoints...</div>
        </div>
      )}
      
      {debugInfo.apiResults.length > 0 && (
        <div style={debugStyles.section}>
          <div style={debugStyles.sectionTitle}>API Test Results</div>
          {debugInfo.apiResults.map((item, index) => (
            <div 
              key={index} 
              style={{
                ...debugStyles.result,
                ...(item.result.success ? debugStyles.success : debugStyles.error)
              }}
            >
              <strong>{item.test.name}</strong> [{item.timestamp}]
              <br />
              Status: {item.result.status} | Duration: {item.result.duration}
              {item.result.success && (
                <div>
                  ✅ Data Keys: {JSON.stringify(item.result.dataKeys)}
                </div>
              )}
              {!item.result.success && (
                <div>❌ Error: {item.result.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {debugInfo.errors.length > 0 && (
        <div style={debugStyles.section}>
          <div style={debugStyles.sectionTitle}>Errors</div>
          {debugInfo.errors.map((item, index) => (
            <div key={index} style={{...debugStyles.result, ...debugStyles.error}}>
              [{item.timestamp}] {item.error}
            </div>
          ))}
        </div>
      )}
      
      <div style={debugStyles.section}>
        <div style={debugStyles.sectionTitle}>Recommendations</div>
        <div style={debugStyles.info}>
          <ul>
            <li>If token is missing: Log out and log back in</li>
            <li>If getting 401 errors: Token may be expired</li>
            <li>If getting 404 errors: Endpoint may not exist</li>
            <li>If getting 500 errors: Server-side issue</li>
            <li>If network errors: Check if backend is running</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CyberScoreDebug;