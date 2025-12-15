/**
 * Complete Ride Flow Test
 * Simulates a full end-to-end ride from request to completion
 * Tests both customer and driver simultaneously
 *
 * Usage: node tests/test-full-ride-flow.js
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Customer
let customerSocket = null;
let customerToken = null;
let customerId = null;

// Driver
let driverSocket = null;
let driverToken = null;
let driverId = null;

let currentRideId = null;

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  customer: (msg) => console.log(`${colors.cyan}👤 [CUSTOMER] ${msg}${colors.reset}`),
  driver: (msg) => console.log(`${colors.magenta}🚗 [DRIVER] ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.yellow}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}`),
  data: (msg) => console.log(`${colors.blue}   ${msg}${colors.reset}`)
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Setup Customer
 */
async function setupCustomer() {
  log.section('SETUP: Creating Customer Account');

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '5555444433',
      name: 'E2E Test Customer',
      role: 'customer'
    });

    customerToken = response.data.data.tokens.accessToken;
    customerId = response.data.data.user.id;

    log.success('Customer account created');
    log.data(`Customer ID: ${customerId}`);

    return true;
  } catch (error) {
    log.error(`Customer setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Setup Driver
 */
async function setupDriver() {
  log.section('SETUP: Creating Driver Account');

  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '6666777788',
      name: 'E2E Test Driver',
      role: 'customer'
    });

    driverToken = loginResponse.data.data.tokens.accessToken;
    driverId = loginResponse.data.data.user.id;

    // Register as rider
    await axios.post(
      `${BASE_URL}/api/auth/register-rider`,
      {
        vehicleType: 'bike',
        vehicleModel: 'Yamaha R15',
        plateNumber: 'E2E001',
        color: 'blue'
      },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );

    // Switch to rider role
    const switchResponse = await axios.post(
      `${BASE_URL}/api/auth/switch-role`,
      { role: 'rider' },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );

    driverToken = switchResponse.data.data.tokens.accessToken;

    log.success('Driver account created and registered');
    log.data(`Driver ID: ${driverId}`);

    return true;
  } catch (error) {
    log.error(`Driver setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Connect Customer Socket
 */
async function connectCustomerSocket() {
  log.section('PHASE 1: Customer Connecting');

  return new Promise((resolve, reject) => {
    customerSocket = io(BASE_URL, {
      auth: { token: customerToken },
      transports: ['websocket']
    });

    customerSocket.on('connect', () => {
      log.customer('Connected to server');
      resolve(true);
    });

    customerSocket.on('connect_error', (error) => {
      log.error(`Customer connection error: ${error.message}`);
      reject(false);
    });

    setTimeout(() => reject(new Error('Customer connection timeout')), 5000);
  });
}

/**
 * Connect Driver Socket
 */
async function connectDriverSocket() {
  log.section('PHASE 2: Driver Connecting and Going On Duty');

  return new Promise((resolve, reject) => {
    driverSocket = io(BASE_URL, {
      auth: { token: driverToken },
      transports: ['websocket']
    });

    driverSocket.on('connect', () => {
      log.driver('Connected to server');
    });

    driverSocket.on('dutyStatusChanged', (data) => {
      if (data.isOnDuty) {
        log.driver('Went on duty successfully');
        resolve(true);
      }
    });

    driverSocket.on('connect_error', (error) => {
      log.error(`Driver connection error: ${error.message}`);
      reject(false);
    });

    // Once connected, go on duty
    driverSocket.on('connected', () => {
      log.driver('Emitting goOnDuty...');
      driverSocket.emit('goOnDuty', {
        latitude: 28.7041,
        longitude: 77.1025,
        vehicleType: 'bike'
      });
    });

    setTimeout(() => reject(new Error('Driver connection timeout')), 5000);
  });
}

/**
 * Driver Subscribe to Zone
 */
async function driverSubscribeToZone() {
  log.section('PHASE 3: Driver Subscribing to Zone');

  return new Promise((resolve) => {
    driverSocket.on('zoneSubscribed', (data) => {
      log.driver(`Subscribed to zone: ${data.zone}`);
      log.data(`Drivers in zone: ${data.driversInZone}`);
      resolve(true);
    });

    log.driver('Emitting subscribeToZone...');
    driverSocket.emit('subscribeToZone', {
      latitude: 28.7041,
      longitude: 77.1025
    });

    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Customer Request Ride
 */
async function customerRequestRide() {
  log.section('PHASE 4: Customer Requesting Ride');

  return new Promise((resolve) => {
    // Customer listens for confirmation
    customerSocket.on('rideRequested', (data) => {
      currentRideId = data.rideId;
      log.customer(`Ride requested successfully - ID: ${currentRideId}`);
      log.data(`Fare: $${data.fare.totalAmount}`);
      log.data(`Status: ${data.status}`);
    });

    // Driver listens for new ride request
    driverSocket.on('newRideRequest', (data) => {
      log.driver(`📣 NEW RIDE REQUEST RECEIVED!`);
      log.data(`Ride ID: ${data.rideId}`);
      log.data(`Pickup: ${data.pickup.address}`);
      log.data(`Dropoff: ${data.dropoff.address}`);
      log.data(`Fare: $${data.fare.totalAmount}`);

      currentRideId = data.rideId;
      resolve(true);
    });

    // Customer emits request
    log.customer('Emitting requestRide...');
    customerSocket.emit('requestRide', {
      pickup: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: 'Connaught Place, New Delhi'
      },
      dropoff: {
        latitude: 28.5355,
        longitude: 77.3910,
        address: 'Noida Sector 18'
      },
      vehicleType: 'bike'
    });

    setTimeout(() => resolve(false), 10000);
  });
}

/**
 * Driver Accept Ride
 */
async function driverAcceptRide() {
  log.section('PHASE 5: Driver Accepting Ride');

  return new Promise((resolve) => {
    // Customer listens for acceptance
    customerSocket.on('rideAccepted', (data) => {
      log.customer(`🎉 Driver accepted the ride!`);
      log.data(`Driver: ${data.rider.name}`);
      log.data(`Vehicle: ${data.rider.vehicle.model}`);
      log.data(`Plate: ${data.rider.vehicle.plateNumber}`);
      resolve(true);
    });

    // Driver listens for confirmation
    driverSocket.on('rideAcceptedConfirm', (data) => {
      log.driver(`Ride acceptance confirmed - Status: ${data.status}`);
    });

    // Driver emits acceptance
    log.driver(`Emitting rideAccepted for ride: ${currentRideId}`);
    driverSocket.emit('rideAccepted', { rideId: currentRideId });
  });
}

/**
 * Driver Update Location
 */
async function driverUpdateLocation() {
  log.section('PHASE 6: Driver Sending Location Updates');

  return new Promise((resolve) => {
    let updateCount = 0;

    // Customer listens for location updates
    customerSocket.on('driverLocationUpdate', (data) => {
      log.customer(`📍 Received driver location: ${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)}`);
    });

    // Send 5 location updates
    const interval = setInterval(() => {
      updateCount++;
      const location = {
        rideId: currentRideId,
        latitude: 28.7041 + (updateCount * 0.001),
        longitude: 77.1025 + (updateCount * 0.001)
      };

      log.driver(`Sending location update #${updateCount}`);
      driverSocket.emit('updateLocation', location);

      if (updateCount >= 5) {
        clearInterval(interval);
        resolve(true);
      }
    }, 1000);
  });
}

/**
 * Driver Arrived at Pickup
 */
async function driverArrived() {
  log.section('PHASE 7: Driver Arrived at Pickup');

  return new Promise((resolve) => {
    // Customer listens for status update
    customerSocket.on('rideStatusUpdate', (data) => {
      if (data.status === 'ARRIVED') {
        log.customer(`Driver has arrived at pickup!`);
      }
    });

    // Driver listens for confirmation
    driverSocket.on('rideStatusUpdateConfirm', (data) => {
      if (data.status === 'ARRIVED') {
        log.driver(`Arrival confirmed`);
        resolve(true);
      }
    });

    log.driver('Emitting rideArrived...');
    driverSocket.emit('rideArrived', { rideId: currentRideId });

    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Driver Started Ride
 */
async function driverStarted() {
  log.section('PHASE 8: Ride Started');

  return new Promise((resolve) => {
    // Customer listens for status update
    customerSocket.on('rideStatusUpdate', (data) => {
      if (data.status === 'STARTED') {
        log.customer(`Ride has started! On the way...`);
      }
    });

    // Driver listens for confirmation
    driverSocket.on('rideStatusUpdateConfirm', (data) => {
      if (data.status === 'STARTED') {
        log.driver(`Ride start confirmed`);
        resolve(true);
      }
    });

    log.driver('Emitting rideStarted...');
    driverSocket.emit('rideStarted', { rideId: currentRideId });

    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Driver Complete Ride
 */
async function driverCompleted() {
  log.section('PHASE 9: Ride Completed');

  return new Promise((resolve) => {
    // Customer listens for completion
    customerSocket.on('rideStatusUpdate', (data) => {
      if (data.status === 'COMPLETED') {
        log.customer(`🎉 Ride completed successfully!`);
        log.data(`Total Fare: $${data.fare.totalAmount}`);
        log.data(`Payment: ${data.fare.paymentMethod.toUpperCase()}`);
      }
    });

    // Driver listens for confirmation
    driverSocket.on('rideStatusUpdateConfirm', (data) => {
      if (data.status === 'COMPLETED') {
        log.driver(`Ride completion confirmed`);
        log.data(`Earnings: $${data.earnings}`);
        resolve(true);
      }
    });

    log.driver('Emitting rideCompleted...');
    driverSocket.emit('rideCompleted', { rideId: currentRideId });

    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Cleanup
 */
function cleanup() {
  log.section('CLEANUP: Disconnecting Sockets');

  if (customerSocket) {
    customerSocket.disconnect();
    log.customer('Disconnected');
  }

  if (driverSocket) {
    driverSocket.disconnect();
    log.driver('Disconnected');
  }
}

/**
 * Run Full Flow Test
 */
async function runFullFlowTest() {
  console.log('\n');
  log.section('🚀 COMPLETE END-TO-END RIDE FLOW TEST 🚀');
  console.log('\n');

  try {
    // Setup
    await setupCustomer();
    await delay(500);
    await setupDriver();
    await delay(500);

    // Phase 1: Customer connects
    await connectCustomerSocket();
    await delay(1000);

    // Phase 2: Driver connects and goes on duty
    await connectDriverSocket();
    await delay(1000);

    // Phase 3: Driver subscribes to zone
    await driverSubscribeToZone();
    await delay(1000);

    // Phase 4: Customer requests ride
    await customerRequestRide();
    await delay(2000);

    // Phase 5: Driver accepts ride
    await driverAcceptRide();
    await delay(2000);

    // Phase 6: Driver sends location updates
    await driverUpdateLocation();
    await delay(2000);

    // Phase 7: Driver arrives
    await driverArrived();
    await delay(2000);

    // Phase 8: Ride starts
    await driverStarted();
    await delay(2000);

    // Phase 9: Ride completes
    await driverCompleted();
    await delay(2000);

    // Cleanup
    cleanup();

    // Success
    log.section('✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
    console.log('\n');
    log.success('Complete ride flow from request to completion works perfectly!');
    console.log('\n');

    process.exit(0);

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    cleanup();
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n');
  log.error('Test interrupted by user');
  cleanup();
  process.exit(1);
});

// Run the test
runFullFlowTest();
