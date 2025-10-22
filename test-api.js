#!/usr/bin/env node

import axios from 'axios';

// Simple console colors
const log = {
  info: (msg) => console.log(`\x1b[34m${msg}\x1b[0m`),      // Blue
  success: (msg) => console.log(`\x1b[32m${msg}\x1b[0m`),   // Green
  error: (msg) => console.log(`\x1b[31m${msg}\x1b[0m`),     // Red
  warn: (msg) => console.log(`\x1b[33m${msg}\x1b[0m`),      // Yellow
  title: (msg) => console.log(`\x1b[1m\x1b[36m${msg}\x1b[0m`), // Bold Cyan
};

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  timeout: 10000,
  testEmail: `test+${Date.now()}@example.com`,
  testPassword: 'TestPassword123!',
  testFirstName: 'Test',
  testLastName: 'User'
};

// Utility function to make API requests
const apiRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      timeout: testConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || { message: error.message },
      status: error.response?.status || 0
    };
  }
};

// Test functions
const tests = {
  async healthCheck() {
    log.info('🏥 Testing health check endpoint...');
    
    const result = await apiRequest('GET', '/health');
    
    if (result.success) {
      log.success('✅ Health check passed');
      console.log(`   Database: ${result.data.database?.status || 'unknown'}`);
      console.log(`   Uptime: ${Math.round(result.data.uptime || 0)} seconds`);
      return true;
    } else {
      log.error('❌ Health check failed');
      console.log(`   Error: ${result.error.message || 'Unknown error'}`);
      return false;
    }
  },

  async signupFlow() {
    log.info('👤 Testing signup flow...');
    
    // Step 1: Request OTP
    console.log('  📧 Requesting OTP...');
    const otpResult = await apiRequest('POST', '/signup/request-otp', {
      email: testConfig.testEmail
    });
    
    if (!otpResult.success) {
      log.error('❌ OTP request failed');
      console.log(`   Error: ${otpResult.error.message || otpResult.error.error}`);
      return false;
    }
    
    log.success('✅ OTP requested successfully');
    
    // For testing, we'll use a development OTP if available
    let otp = otpResult.data.developmentOtp;
    if (!otp) {
      log.warn('⚠️  No development OTP available, using 123456 for testing');
      otp = '123456';
    } else {
      console.log(`   Development OTP: ${otp}`);
    }
    
    // Step 2: Verify signup
    console.log('  ✅ Verifying signup...');
    const signupResult = await apiRequest('POST', '/signup/verify', {
      email: testConfig.testEmail,
      otp: otp,
      password: testConfig.testPassword,
      confirmPassword: testConfig.testPassword,
      firstName: testConfig.testFirstName,
      lastName: testConfig.testLastName
    });
    
    if (!signupResult.success) {
      log.error('❌ Signup verification failed');
      console.log(`   Error: ${signupResult.error.message || signupResult.error.error}`);
      if (signupResult.error.details) {
        console.log(`   Details: ${signupResult.error.details.join(', ')}`);
      }
      return false;
    }
    
    log.success('✅ Signup completed successfully');
    return true;
  },

  async loginFlow() {
    log.info('🔐 Testing login flow...');
    
    const loginResult = await apiRequest('POST', '/login/direct', {
      email: testConfig.testEmail,
      password: testConfig.testPassword,
      rememberMe: false
    });
    
    if (!loginResult.success) {
      log.error('❌ Login failed');
      console.log(`   Error: ${loginResult.error.message || loginResult.error.error}`);
      return false;
    }
    
    log.success('✅ Login successful');
    console.log(`   User ID: ${loginResult.data.user?.id || 'unknown'}`);
    console.log(`   Email: ${loginResult.data.user?.email || 'unknown'}`);
    
    // Store token for further testing
    testConfig.authToken = loginResult.data.token;
    return true;
  },

  async logout() {
    log.info('👋 Testing logout...');
    
    if (!testConfig.authToken) {
      log.warn('⚠️  No auth token available for logout test');
      return true;
    }
    
    const logoutResult = await apiRequest('POST', '/login/logout', null, {
      'Authorization': `Bearer ${testConfig.authToken}`
    });
    
    if (!logoutResult.success) {
      log.error('❌ Logout failed');
      console.log(`   Error: ${logoutResult.error.message || 'Unknown error'}`);
      return false;
    }
    
    log.success('✅ Logout successful');
    return true;
  }
};

// Main test runner
async function runTests() {
  log.title('\n🧪 Starting API Integration Tests\n');
  console.log(`Testing against: ${API_BASE_URL}`);
  console.log(`Test email: ${testConfig.testEmail}\n`);
  
  const results = [];
  const testOrder = ['healthCheck', 'signupFlow', 'loginFlow', 'logout'];
  
  for (const testName of testOrder) {
    try {
      const result = await tests[testName]();
      results.push({ name: testName, passed: result });
      
      if (!result) {
        log.error(`\n❌ Test '${testName}' failed. Stopping test suite.\n`);
        break;
      }
      
      console.log(''); // Add spacing between tests
    } catch (error) {
      log.error(`❌ Test '${testName}' threw an error: ${error.message}`);
      results.push({ name: testName, passed: false, error: error.message });
      break;
    }
  }
  
  // Summary
  log.title('📊 Test Summary:');
  console.log('================');
  
  let passedCount = 0;
  let totalCount = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.passed) passedCount++;
    if (result.error) console.log(`     Error: ${result.error}`);
  });
  
  console.log('================');
  console.log(`Total: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount && totalCount > 0) {
    log.success('\n🎉 All tests passed! Frontend-backend integration looks good.\n');
    process.exit(0);
  } else {
    log.error('\n💥 Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log.error(`\n❌ Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`\n❌ Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export default { runTests, tests, testConfig };