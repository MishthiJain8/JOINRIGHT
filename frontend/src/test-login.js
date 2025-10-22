// Simple test to debug login issues
const testLogin = async () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const loginUrl = `${apiUrl}/api/login/direct`;
  
  console.log('Testing login with URL:', loginUrl);
  
  const credentials = {
    email: 'admin@jointright.com',
    password: 'admin123456'
  };
  
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      console.log('✅ Login successful!');
      console.log('User:', data.user);
      console.log('Token:', data.token);
    } else {
      console.log('❌ Login failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Run the test
testLogin();