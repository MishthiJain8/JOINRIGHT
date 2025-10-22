// Debug script to check loading issues
// Run this in the browser console while on the admin dashboard

console.log('🔍 Starting CyberScore Loading Diagnosis...');

// Check if we're on the right page
if (window.location.href.includes('admin')) {
  console.log('✅ On admin page');
} else {
  console.log('❌ Not on admin page - navigate to admin dashboard first');
}

// Check for authentication token
const token = localStorage.getItem('authToken');
if (token) {
  console.log('✅ Auth token found:', token.substring(0, 20) + '...');
} else {
  console.log('❌ No auth token found in localStorage');
  console.log('Available localStorage keys:', Object.keys(localStorage));
}

// Check API configuration
if (window.API_CONFIG) {
  console.log('✅ API_CONFIG available:', window.API_CONFIG);
} else {
  console.log('❌ API_CONFIG not available');
}

// Test the API endpoints directly
async function testAPI() {
  const baseUrl = 'http://localhost:5000';
  const endpoints = [
    '/api/admin/health',
    '/api/admin/cyber-scores/reviews?page=1&limit=5',
    '/api/admin/cyber-scores/bulk?limit=10'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing: ${endpoint}`);
    
    try {
      const response = await fetch(baseUrl + endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Data received:', {
          success: data.success,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : []
        });
      } else {
        const errorText = await response.text();
        console.log('❌ Error:', errorText);
      }
    } catch (error) {
      console.log('💥 Network Error:', error.message);
    }
  }
}

// Check React component state
function checkReactState() {
  console.log('\n🔍 Checking React component state...');
  
  // Try to find React components
  const containers = document.querySelectorAll('[data-reactroot], .cyber-score-management');
  console.log('Found React containers:', containers.length);
  
  // Check for loading indicators
  const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
  console.log('Loading elements found:', loadingElements.length);
  
  loadingElements.forEach((el, index) => {
    console.log(`Loading element ${index}:`, el.textContent, el.className);
  });
}

// Check console for errors
function checkConsoleErrors() {
  console.log('\n🚨 Checking for console errors...');
  console.log('Check the Console tab for any red error messages');
  console.log('Check the Network tab for failed requests (red entries)');
}

// Run all checks
async function runDiagnosis() {
  checkReactState();
  checkConsoleErrors();
  
  if (token) {
    await testAPI();
  } else {
    console.log('\n⚠️ Cannot test API without auth token');
    console.log('To get auth token:');
    console.log('1. Make sure you are logged in as admin');
    console.log('2. Check Application → Local Storage for authToken');
    console.log('3. Or try logging out and logging back in');
  }
  
  console.log('\n📋 Summary:');
  console.log('- If you see network errors: Backend might not be running');
  console.log('- If you see 401 errors: Auth token is invalid/expired');
  console.log('- If you see 500 errors: Backend has issues');
  console.log('- If no errors but still loading: Frontend state management issue');
}

runDiagnosis();

// Also provide manual test functions
window.debugCyberScore = {
  testAPI,
  checkReactState,
  token: token ? token.substring(0, 20) + '...' : 'None'
};

console.log('\n🛠️ Debug functions available:');
console.log('- debugCyberScore.testAPI() - Test API endpoints');
console.log('- debugCyberScore.checkReactState() - Check React state');