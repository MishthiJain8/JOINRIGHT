// Test script for cyber score performance improvements
const API_BASE = 'http://localhost:5000/api';

// Mock authentication token - replace with actual token
const AUTH_TOKEN = 'your-auth-token-here';

const testEndpoints = [
  {
    name: 'Cyber Score Reviews',
    url: `${API_BASE}/admin/cyber-scores/reviews?page=1&limit=20`,
    description: 'Test the optimized reviews endpoint'
  },
  {
    name: 'Bulk User Cyber Scores',
    url: `${API_BASE}/admin/cyber-scores/bulk?page=1&limit=50`,
    description: 'Test the new bulk cyber scores endpoint'
  },
  {
    name: 'System Health',
    url: `${API_BASE}/admin/health`,
    description: 'Test admin system health check'
  }
];

async function testEndpoint(test) {
  console.log(`\n📋 Testing: ${test.name}`);
  console.log(`   Description: ${test.description}`);
  console.log(`   URL: ${test.url}`);
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(test.url, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`   ⏱️  Response Time: ${duration}ms`);
    console.log(`   📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Data loaded`);
      
      // Log some basic metrics about the response
      if (data.data) {
        if (data.data.reviews) {
          console.log(`   📝 Reviews: ${data.data.reviews.length} items`);
        }
        if (data.data.userScores) {
          console.log(`   👥 User Scores: ${data.data.userScores.length} items`);
        }
        if (data.data.pagination) {
          console.log(`   📄 Pagination: Page ${data.data.pagination.currentPage} of ${data.data.pagination.totalPages}`);
        }
      }
      
      return { success: true, duration, status: response.status };
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return { success: false, duration, status: response.status, error: errorText };
    }
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    console.log(`   💥 Network Error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function runPerformanceTests() {
  console.log('🚀 Starting Cyber Score Performance Tests');
  console.log('==========================================');
  
  if (AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️  WARNING: Please update AUTH_TOKEN with a real token');
    console.log('   You can get this from your browser\'s localStorage after logging in');
    console.log('   Or use the admin credentials to get a token');
    console.log('\n   For now, tests will run but may return 401 errors\n');
  }
  
  const results = [];
  
  for (const test of testEndpoints) {
    const result = await testEndpoint(test);
    results.push({ ...test, result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgDuration = Math.round(
      successful.reduce((sum, r) => sum + r.result.duration, 0) / successful.length
    );
    console.log(`⏱️  Average Response Time: ${avgDuration}ms`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.result.error || `HTTP ${f.result.status}`}`);
    });
  }
  
  console.log('\n📈 Performance Recommendations:');
  console.log('- Response times under 200ms: Excellent');
  console.log('- Response times 200-500ms: Good'); 
  console.log('- Response times 500-1000ms: Needs improvement');
  console.log('- Response times over 1000ms: Poor, investigate immediately');
  
  console.log('\n🔧 If tests fail with 401 errors:');
  console.log('1. Log into the admin dashboard');
  console.log('2. Open browser developer tools');
  console.log('3. Go to Application/Storage > Local Storage');
  console.log('4. Find the "authToken" value');
  console.log('5. Update AUTH_TOKEN in this script with that value');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Running in Node.js
  const { performance } = require('perf_hooks');
  const fetch = require('node-fetch');
  
  runPerformanceTests().catch(console.error);
} else {
  // Running in browser
  console.log('To run tests, call: runPerformanceTests()');
}

// Export for browser usage
if (typeof module !== 'undefined') {
  module.exports = { runPerformanceTests, testEndpoints };
}