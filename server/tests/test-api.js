/**
 * REST API Test Suite
 * Tests all authentication and ride endpoints
 *
 * Usage: node tests/test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let customerToken = null;
let riderToken = null;
let customerId = null;
let riderId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.yellow}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`),
  data: (msg) => console.log(`${colors.blue}   ${msg}${colors.reset}`)
};

/**
 * Delay helper
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test 1: Server Health Check
 */
async function testHealthCheck() {
  log.section('TEST 1: Server Health Check');
  try {
    const response = await axios.get(`${BASE_URL}/health`);

    if (response.status === 200 && response.data.success) {
      log.success('Server is running');
      log.data(`Connected Users: ${response.data.stats.connectedUsers}`);
      log.data(`Active Rides: ${response.data.stats.activeRides}`);
      log.data(`Total Drivers Online: ${response.data.stats.zoneStats.totalDrivers}`);
      return true;
    }
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    log.error('Make sure the server is running on port 3000');
    return false;
  }
}

/**
 * Test 2: Customer Login/Signup
 */
async function testCustomerLogin() {
  log.section('TEST 2: Customer Login/Signup');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '1234567890',
      name: 'Test Customer',
      role: 'customer'
    });

    if (response.data.success) {
      customerToken = response.data.data.tokens.accessToken;
      customerId = response.data.data.user.id;

      log.success('Customer login successful');
      log.data(`Customer ID: ${customerId}`);
      log.data(`Phone: ${response.data.data.user.phone}`);
      log.data(`Role: ${response.data.data.user.role.join(', ')}`);
      log.data(`Access Token: ${customerToken.substring(0, 30)}...`);
      return true;
    }
  } catch (error) {
    log.error(`Customer login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 3: Rider Login/Signup
 */
async function testRiderLogin() {
  log.section('TEST 3: Rider (Driver) Login/Signup');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '9876543210',
      name: 'Test Rider',
      role: 'customer' // Start as customer, then register as rider
    });

    if (response.data.success) {
      riderToken = response.data.data.tokens.accessToken;
      riderId = response.data.data.user.id;

      log.success('Rider login successful');
      log.data(`Rider ID: ${riderId}`);
      log.data(`Phone: ${response.data.data.user.phone}`);
      log.data(`Access Token: ${riderToken.substring(0, 30)}...`);
      return true;
    }
  } catch (error) {
    log.error(`Rider login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 4: Register as Rider
 */
async function testRegisterRider() {
  log.section('TEST 4: Register as Rider (Add Vehicle Details)');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/register-rider`,
      {
        vehicleType: 'bike',
        vehicleModel: 'Honda Activa',
        plateNumber: 'DL01AB1234',
        color: 'black'
      },
      {
        headers: { Authorization: `Bearer ${riderToken}` }
      }
    );

    if (response.data.success) {
      log.success('Rider registration successful');
      log.data(`Vehicle Type: ${response.data.data.riderProfile.vehicle.type}`);
      log.data(`Vehicle Model: ${response.data.data.riderProfile.vehicle.model}`);
      log.data(`Plate Number: ${response.data.data.riderProfile.vehicle.plateNumber}`);
      log.data(`Roles: ${response.data.data.role.join(', ')}`);
      return true;
    }
  } catch (error) {
    log.error(`Rider registration failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 5: Get Customer Profile
 */
async function testGetProfile() {
  log.section('TEST 5: Get Customer Profile');
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    if (response.data.success) {
      log.success('Profile fetched successfully');
      log.data(`Name: ${response.data.data.user.name}`);
      log.data(`Phone: ${response.data.data.user.phone}`);
      log.data(`Active Role: ${response.data.data.user.activeRole}`);
      log.data(`Total Rides: ${response.data.data.user.customerProfile.totalRides}`);
      return true;
    }
  } catch (error) {
    log.error(`Get profile failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 6: Calculate Fare
 */
async function testCalculateFare() {
  log.section('TEST 6: Calculate Fare Estimate');
  try {
    // Delhi to Noida coordinates
    const response = await axios.post(
      `${BASE_URL}/api/rides/calculate-fare`,
      {
        pickupLat: 28.7041,
        pickupLng: 77.1025,
        dropoffLat: 28.5355,
        dropoffLng: 77.3910,
        vehicleType: 'cab'
      },
      {
        headers: { Authorization: `Bearer ${customerToken}` }
      }
    );

    if (response.data.success) {
      const data = response.data.data;
      log.success('Fare calculated successfully');
      log.data(`Distance: ${data.distance.km} km`);
      log.data(`Estimated Duration: ${data.duration} min`);

      console.log('\n   Fare Breakdown:');
      data.fares.forEach(fare => {
        log.data(`   ${fare.vehicleType.toUpperCase()}: $${fare.totalAmount} (Base: $${fare.baseFare} + $${fare.pricePerKm}/km)`);
      });
      return true;
    }
  } catch (error) {
    log.error(`Fare calculation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 7: Token Refresh
 */
async function testTokenRefresh() {
  log.section('TEST 7: Refresh Access Token');
  try {
    // First, get the refresh token by logging in again
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '1234567890',
      name: 'Test Customer',
      role: 'customer'
    });

    const refreshToken = loginResponse.data.data.tokens.refreshToken;

    // Now refresh the access token
    const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
      refreshToken
    });

    if (response.data.success) {
      const newAccessToken = response.data.data.tokens.accessToken;
      log.success('Token refresh successful');
      log.data(`New Access Token: ${newAccessToken.substring(0, 30)}...`);
      log.data(`New Refresh Token: ${response.data.data.tokens.refreshToken.substring(0, 30)}...`);

      // Update customer token for future tests
      customerToken = newAccessToken;
      return true;
    }
  } catch (error) {
    log.error(`Token refresh failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 8: Switch Role
 */
async function testSwitchRole() {
  log.section('TEST 8: Switch Role (Customer to Rider)');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/switch-role`,
      {
        role: 'rider'
      },
      {
        headers: { Authorization: `Bearer ${riderToken}` }
      }
    );

    if (response.data.success) {
      log.success('Role switch successful');
      log.data(`New Active Role: ${response.data.data.activeRole}`);
      log.data(`New Access Token: ${response.data.data.tokens.accessToken.substring(0, 30)}...`);

      // Update rider token
      riderToken = response.data.data.tokens.accessToken;
      return true;
    }
  } catch (error) {
    log.error(`Role switch failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 9: Get Ride History (should be empty)
 */
async function testGetRideHistory() {
  log.section('TEST 9: Get Ride History');
  try {
    const response = await axios.get(
      `${BASE_URL}/api/rides/history?role=customer&limit=10`,
      {
        headers: { Authorization: `Bearer ${customerToken}` }
      }
    );

    if (response.data.success) {
      log.success('Ride history fetched successfully');
      log.data(`Total Rides: ${response.data.data.pagination.total}`);
      log.data(`Current Page: ${response.data.data.pagination.page}`);

      if (response.data.data.rides.length > 0) {
        console.log('\n   Recent Rides:');
        response.data.data.rides.forEach((ride, index) => {
          log.data(`   ${index + 1}. Status: ${ride.status}, Fare: $${ride.fare.totalAmount}, Vehicle: ${ride.vehicleType}`);
        });
      } else {
        log.info('No rides found (expected for new user)');
      }
      return true;
    }
  } catch (error) {
    log.error(`Get ride history failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Test 10: Invalid Token Test
 */
async function testInvalidToken() {
  log.section('TEST 10: Invalid Token Test (Security Check)');
  try {
    await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: 'Bearer invalid-token-12345' }
    });

    log.error('Security issue: Invalid token was accepted!');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success('Invalid token correctly rejected (401)');
      log.data(`Error Message: ${error.response.data.message}`);
      return true;
    } else {
      log.error(`Unexpected error: ${error.message}`);
      return false;
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n');
  log.section('🧪 UBER CLONE - REST API TEST SUITE 🧪');
  console.log('\n');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Customer Login', fn: testCustomerLogin },
    { name: 'Rider Login', fn: testRiderLogin },
    { name: 'Register Rider', fn: testRegisterRider },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Calculate Fare', fn: testCalculateFare },
    { name: 'Token Refresh', fn: testTokenRefresh },
    { name: 'Switch Role', fn: testSwitchRole },
    { name: 'Get Ride History', fn: testGetRideHistory },
    { name: 'Invalid Token', fn: testInvalidToken }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    await delay(500); // Small delay between tests
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  log.section('📊 TEST RESULTS SUMMARY');
  console.log(`\n   Total Tests: ${tests.length}`);
  console.log(`   ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`   ${colors.red}Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n   ${colors.green}${colors.bold}🎉 ALL TESTS PASSED! 🎉${colors.reset}\n`);
  } else {
    console.log(`\n   ${colors.red}${colors.bold}⚠️  SOME TESTS FAILED ⚠️${colors.reset}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log.error(`Test suite error: ${error.message}`);
  process.exit(1);
});
