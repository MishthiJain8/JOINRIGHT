// Test script for admin cyber score endpoints
// This script tests the new admin endpoints without starting a new server

const testEndpoints = async () => {
  const BASE_URL = 'http://localhost:5000';
  
  // You would need to replace this with a real admin JWT token
  const ADMIN_TOKEN = 'your-admin-jwt-token-here';
  
  const headers = {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('🧪 Testing Admin Cyber Score Endpoints...\n');

    // Test 1: Get all cyber score reviews
    console.log('1. Testing GET /api/admin/cyber-scores/reviews');
    const reviewsResponse = await fetch(`${BASE_URL}/api/admin/cyber-scores/reviews?page=1&limit=10`, {
      method: 'GET',
      headers
    });
    
    if (reviewsResponse.ok) {
      const reviewsData = await reviewsResponse.json();
      console.log('✅ Reviews endpoint working');
      console.log(`   Found ${reviewsData.data?.reviews?.length || 0} reviews`);
    } else {
      console.log(`❌ Reviews endpoint failed: ${reviewsResponse.status}`);
    }

    // Test 2: Get user cyber score details (using a placeholder ID)
    const testUserId = '60d0fe4f5311236168a109ca'; // Replace with actual user ID
    console.log('\n2. Testing GET /api/admin/cyber-scores/:userId');
    const userScoreResponse = await fetch(`${BASE_URL}/api/admin/cyber-scores/${testUserId}`, {
      method: 'GET',
      headers
    });
    
    if (userScoreResponse.ok) {
      const userScoreData = await userScoreResponse.json();
      console.log('✅ User cyber score details endpoint working');
    } else {
      console.log(`❌ User cyber score details failed: ${userScoreResponse.status}`);
    }

    // Test 3: Update user cyber score (won't actually update without valid token)
    console.log('\n3. Testing PUT /api/admin/cyber-scores/:userId');
    const updateResponse = await fetch(`${BASE_URL}/api/admin/cyber-scores/${testUserId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        currentScore: 75,
        reason: 'Test adjustment from admin dashboard'
      })
    });
    
    if (updateResponse.ok) {
      console.log('✅ Update cyber score endpoint working');
    } else {
      console.log(`❌ Update cyber score failed: ${updateResponse.status}`);
    }

    // Test 4: Delete review (won't actually delete without valid token)
    const testReviewId = '60d0fe4f5311236168a109cb'; // Replace with actual review ID
    console.log('\n4. Testing DELETE /api/admin/cyber-scores/:userId/reviews/:reviewId');
    const deleteResponse = await fetch(`${BASE_URL}/api/admin/cyber-scores/${testUserId}/reviews/${testReviewId}`, {
      method: 'DELETE',
      headers
    });
    
    if (deleteResponse.status === 401 || deleteResponse.status === 403) {
      console.log('✅ Delete review endpoint exists (auth required)');
    } else if (deleteResponse.ok) {
      console.log('✅ Delete review endpoint working');
    } else {
      console.log(`❌ Delete review failed: ${deleteResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

console.log('Admin Cyber Score Endpoints Test');
console.log('=================================');
console.log('This script tests the new admin endpoints for cyber score management.');
console.log('Note: You need a valid admin JWT token to test authenticated endpoints.\n');

// Uncomment the line below to run the tests (requires server to be running)
// testEndpoints();

export { testEndpoints };