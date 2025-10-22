// Simple test for cyber score API endpoint
const testCyberScoreAPI = async () => {
  try {
    console.log('🧪 Testing Cyber Score Reviews API...');
    
    // Test without authentication to see if endpoint exists
    const response = await fetch('http://localhost:5000/api/admin/cyber-scores/reviews?page=1&limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Response Status: ${response.status}`);
    
    const responseText = await response.text();
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists (authentication required)');
      console.log('Response:', responseText.substring(0, 200));
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - route may not be registered');
    } else if (response.status === 200) {
      console.log('✅ Endpoint working (unexpected - should require auth)');
      const data = JSON.parse(responseText);
      console.log(`Found ${data.data?.reviews?.length || 0} reviews`);
    } else {
      console.log(`🤔 Unexpected status: ${response.status}`);
      console.log('Response:', responseText.substring(0, 200));
    }
    
  } catch (error) {
    if (error.message.includes('fetch is not defined')) {
      console.log('❌ This Node.js version doesn\'t support fetch. Please use Node 18+');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on port 5000');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
};

console.log('🔍 Testing Cyber Score API Endpoint');
console.log('===================================');
testCyberScoreAPI();