// Quick test script for cyber score endpoints
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📡 URL: ${API_BASE}${endpoint}`);
    
    const start = Date.now();
    const response = await fetch(`${API_BASE}${endpoint}`);
    const duration = Date.now() - start;
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('🔐 Authentication required (expected for admin endpoints)');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', JSON.stringify(data).substring(0, 100) + '...');
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText.substring(0, 200));
    }
    
    return { status: response.status, duration };
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Cyber Score API Endpoints');
  console.log('====================================');
  
  const tests = [
    ['/admin/health', 'Admin Health Check'],
    ['/admin/cyber-scores/reviews', 'Cyber Score Reviews'],
    ['/admin/cyber-scores/bulk', 'Bulk User Cyber Scores (new endpoint)'],
    ['/admin/users', 'Users List'],
    ['/admin/stats', 'System Stats']
  ];
  
  for (const [endpoint, description] of tests) {
    await testEndpoint(endpoint, description);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  console.log('\n📋 Summary:');
  console.log('- 200: Working correctly');
  console.log('- 401: Authentication required (normal for admin endpoints)'); 
  console.log('- 404: Endpoint not found (needs investigation)');
  console.log('- 500: Server error (needs urgent fix)');
}

runTests().catch(console.error);