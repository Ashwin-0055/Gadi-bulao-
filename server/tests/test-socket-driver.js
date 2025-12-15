/**
 * Socket.io Driver Flow Test
 * Tests driver-side socket events
 *
 * Usage: node tests/test-socket-driver.js
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let socket = null;
let accessToken = null;
let driverId = null;

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  event: (msg) => console.log(`${colors.magenta}🔔 ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.yellow}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`),
  data: (msg) => console.log(`${colors.blue}   ${msg}${colors.reset}`)
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Step 1: Login as Driver
 */
async function loginAsDriver() {
  log.section('STEP 1: Driver Login & Registration');
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '9999888877',
      name: 'Test Driver',
      role: 'customer'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    accessToken = loginResponse.data.data.tokens.accessToken;
    driverId = loginResponse.data.data.user.id;

    log.success('Driver logged in successfully');
    log.data(`Driver ID: ${driverId}`);

    // Register as rider
    const registerResponse = await axios.post(
      `${BASE_URL}/api/auth/register-rider`,
      {
        vehicleType: 'bike',
        vehicleModel: 'Honda Activa',
        plateNumber: 'TEST001',
        color: 'red'
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!registerResponse.data.success) {
      throw new Error('Rider registration failed');
    }

    log.success('Registered as rider');
    log.data(`Vehicle: ${registerResponse.data.data.riderProfile.vehicle.model}`);

    // Switch to rider role
    const switchResponse = await axios.post(
      `${BASE_URL}/api/auth/switch-role`,
      { role: 'rider' },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!switchResponse.data.success) {
      throw new Error('Role switch failed');
    }

    accessToken = switchResponse.data.data.tokens.accessToken;
    log.success('Switched to rider role');

    return true;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Step 2: Connect to Socket.io
 */
async function connectSocket() {
  log.section('STEP 2: Connect to Socket.io Server');

  return new Promise((resolve, reject) => {
    socket = io(BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      log.success(`Connected to Socket.io server`);
      log.data(`Socket ID: ${socket.id}`);
      resolve(true);
    });

    socket.on('connected', (data) => {
      log.event(`Server acknowledged connection`);
      log.data(`User ID: ${data.userId}`);
    });

    socket.on('connect_error', (error) => {
      log.error(`Connection error: ${error.message}`);
      reject(false);
    });

    socket.on('error', (error) => {
      log.error(`Socket error: ${error.message}`);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!socket.connected) {
        reject(new Error('Connection timeout'));
      }
    }, 5000);
  });
}

/**
 * Step 3: Go On Duty
 */
async function testGoOnDuty() {
  log.section('STEP 3: Go On Duty');

  return new Promise((resolve) => {
    // Listen for duty status change
    socket.on('dutyStatusChanged', (data) => {
      if (data.isOnDuty) {
        log.success('Successfully went on duty');
        log.data(`Location: ${data.location.latitude}, ${data.location.longitude}`);
        resolve(true);
      }
    });

    // Emit go on duty
    log.info('Emitting goOnDuty event...');
    socket.emit('goOnDuty', {
      latitude: 28.7041,
      longitude: 77.1025,
      vehicleType: 'bike'
    });

    // Timeout
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Step 4: Subscribe to Zone
 */
async function testSubscribeToZone() {
  log.section('STEP 4: Subscribe to Geospatial Zone');

  return new Promise((resolve) => {
    // Listen for zone subscription confirmation
    socket.on('zoneSubscribed', (data) => {
      log.success('Successfully subscribed to zone');
      log.data(`Zone Hash: ${data.zone}`);
      log.data(`Drivers in Zone: ${data.driversInZone}`);
      resolve(true);
    });

    // Emit subscribe to zone
    log.info('Emitting subscribeToZone event...');
    socket.emit('subscribeToZone', {
      latitude: 28.7041,
      longitude: 77.1025
    });

    // Timeout
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Step 5: Listen for Ride Requests
 */
async function testListenForRides() {
  log.section('STEP 5: Listening for Ride Requests');

  log.info('Driver is now listening for ride requests in the zone...');
  log.info('This test will wait 30 seconds for incoming rides.');
  log.info('Run the customer test (test-socket-customer.js) in another terminal to trigger a ride request.');
  console.log('\n');

  return new Promise((resolve) => {
    let rideReceived = false;

    socket.on('newRideRequest', (data) => {
      rideReceived = true;
      log.event('📣 NEW RIDE REQUEST RECEIVED!');
      log.data(`Ride ID: ${data.rideId}`);
      log.data(`Customer ID: ${data.customerId}`);
      log.data(`Pickup: ${data.pickup.address}`);
      log.data(`Dropoff: ${data.dropoff.address}`);
      log.data(`Vehicle Type: ${data.vehicleType}`);
      log.data(`Distance: ${data.distance} km`);
      log.data(`Fare: $${data.fare.totalAmount}`);

      // Accept the ride after 2 seconds
      setTimeout(() => {
        testAcceptRide(data.rideId);
      }, 2000);
    });

    socket.on('rideUnavailable', (data) => {
      log.event('Ride unavailable (already accepted by another driver)');
      log.data(`Ride ID: ${data.rideId}`);
    });

    // Wait 30 seconds
    setTimeout(() => {
      if (rideReceived) {
        log.success('Ride request test passed');
        resolve(true);
      } else {
        log.info('No ride requests received (expected if customer test not running)');
        resolve(true); // Still pass the test
      }
    }, 30000);
  });
}

/**
 * Test Accept Ride
 */
function testAcceptRide(rideId) {
  log.section('STEP 6: Accepting Ride');

  socket.on('rideAcceptedConfirm', (data) => {
    log.success('Ride accepted successfully');
    log.data(`Ride ID: ${data.rideId}`);
    log.data(`Status: ${data.status}`);

    // Simulate driver actions
    setTimeout(() => testUpdateLocation(rideId), 3000);
    setTimeout(() => testRideArrived(rideId), 6000);
    setTimeout(() => testRideStarted(rideId), 9000);
    setTimeout(() => testRideCompleted(rideId), 12000);
  });

  log.info(`Emitting rideAccepted for ride: ${rideId}`);
  socket.emit('rideAccepted', { rideId });
}

/**
 * Test Update Location
 */
function testUpdateLocation(rideId) {
  log.section('STEP 7: Updating Driver Location');

  log.info('Sending location updates...');

  // Send location updates every 2 seconds
  const locationInterval = setInterval(() => {
    const location = {
      rideId,
      latitude: 28.7041 + Math.random() * 0.01,
      longitude: 77.1025 + Math.random() * 0.01
    };

    socket.emit('updateLocation', location);
    log.data(`📍 Location sent: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
  }, 2000);

  // Stop after 10 seconds
  setTimeout(() => {
    clearInterval(locationInterval);
    log.success('Location updates completed');
  }, 10000);
}

/**
 * Test Ride Arrived
 */
function testRideArrived(rideId) {
  log.section('STEP 8: Driver Arrived at Pickup');

  socket.on('rideStatusUpdateConfirm', (data) => {
    if (data.status === 'ARRIVED') {
      log.success('Arrival confirmed');
      log.data(`Ride ID: ${data.rideId}`);
    }
  });

  log.info('Emitting rideArrived event...');
  socket.emit('rideArrived', { rideId });
}

/**
 * Test Ride Started
 */
function testRideStarted(rideId) {
  log.section('STEP 9: Ride Started');

  socket.on('rideStatusUpdateConfirm', (data) => {
    if (data.status === 'STARTED') {
      log.success('Ride started confirmed');
      log.data(`Ride ID: ${data.rideId}`);
    }
  });

  log.info('Emitting rideStarted event...');
  socket.emit('rideStarted', { rideId });
}

/**
 * Test Ride Completed
 */
function testRideCompleted(rideId) {
  log.section('STEP 10: Ride Completed');

  socket.on('rideStatusUpdateConfirm', (data) => {
    if (data.status === 'COMPLETED') {
      log.success('Ride completed successfully! 🎉');
      log.data(`Ride ID: ${data.rideId}`);
      log.data(`Earnings: $${data.earnings}`);

      // Go back on duty
      setTimeout(() => testGoOffDuty(), 3000);
    }
  });

  log.info('Emitting rideCompleted event...');
  socket.emit('rideCompleted', { rideId });
}

/**
 * Test Go Off Duty
 */
function testGoOffDuty() {
  log.section('STEP 11: Go Off Duty');

  socket.on('dutyStatusChanged', (data) => {
    if (!data.isOnDuty) {
      log.success('Successfully went off duty');

      // Disconnect and finish
      setTimeout(() => {
        socket.disconnect();
        log.section('✅ ALL DRIVER TESTS COMPLETED SUCCESSFULLY');
        process.exit(0);
      }, 2000);
    }
  });

  log.info('Emitting goOffDuty event...');
  socket.emit('goOffDuty');
}

/**
 * Run all tests
 */
async function runDriverTests() {
  console.log('\n');
  log.section('🚗 UBER CLONE - DRIVER SOCKET.IO TEST SUITE 🚗');
  console.log('\n');

  try {
    // Login
    const loginSuccess = await loginAsDriver();
    if (!loginSuccess) {
      throw new Error('Login failed');
    }

    await delay(1000);

    // Connect socket
    const connectSuccess = await connectSocket();
    if (!connectSuccess) {
      throw new Error('Socket connection failed');
    }

    await delay(1000);

    // Go on duty
    const dutySuccess = await testGoOnDuty();
    if (!dutySuccess) {
      throw new Error('Go on duty failed');
    }

    await delay(1000);

    // Subscribe to zone
    const zoneSuccess = await testSubscribeToZone();
    if (!zoneSuccess) {
      throw new Error('Zone subscription failed');
    }

    await delay(1000);

    // Listen for rides
    await testListenForRides();

  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    if (socket) {
      socket.disconnect();
    }
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n');
  log.info('Test interrupted by user');
  if (socket) {
    socket.disconnect();
  }
  process.exit(0);
});

// Run tests
runDriverTests();
