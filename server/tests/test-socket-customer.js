/**
 * Socket.io Customer Flow Test
 * Tests customer-side socket events
 *
 * Usage: node tests/test-socket-customer.js
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let socket = null;
let accessToken = null;
let customerId = null;
let currentRideId = null;

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
 * Step 1: Login as Customer
 */
async function loginAsCustomer() {
  log.section('STEP 1: Customer Login');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: '1111222233',
      name: 'Test Customer',
      role: 'customer'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    accessToken = loginResponse.data.data.tokens.accessToken;
    customerId = loginResponse.data.data.user.id;

    log.success('Customer logged in successfully');
    log.data(`Customer ID: ${customerId}`);

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
 * Step 3: Request a Ride
 */
async function testRequestRide() {
  log.section('STEP 3: Request a Ride');

  return new Promise((resolve) => {
    // Listen for ride requested confirmation
    socket.on('rideRequested', (data) => {
      log.success('Ride request sent successfully');
      log.data(`Ride ID: ${data.rideId}`);
      log.data(`Status: ${data.status}`);
      log.data(`Fare: $${data.fare.totalAmount}`);
      log.data(`Zones Notified: ${data.zonesNotified}`);

      currentRideId = data.rideId;

      log.info('Waiting for a driver to accept...');
      resolve(true);
    });

    // Emit request ride
    log.info('Emitting requestRide event...');

    const rideRequest = {
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
    };

    log.data(`Pickup: ${rideRequest.pickup.address}`);
    log.data(`Dropoff: ${rideRequest.dropoff.address}`);
    log.data(`Vehicle: ${rideRequest.vehicleType}`);

    socket.emit('requestRide', rideRequest);

    // Timeout
    setTimeout(() => resolve(false), 10000);
  });
}

/**
 * Step 4: Wait for Driver Acceptance
 */
async function testWaitForAcceptance() {
  log.section('STEP 4: Waiting for Driver to Accept');

  return new Promise((resolve) => {
    socket.on('rideAccepted', (data) => {
      log.event('🎉 DRIVER ACCEPTED YOUR RIDE!');
      log.data(`Ride ID: ${data.rideId}`);
      log.data(`Driver Name: ${data.rider.name}`);
      log.data(`Driver Phone: ${data.rider.phone}`);
      log.data(`Vehicle: ${data.rider.vehicle.model} (${data.rider.vehicle.plateNumber})`);
      log.data(`Driver Location: ${data.rider.location.latitude}, ${data.rider.location.longitude}`);

      log.success('Now tracking driver location in real-time...');
      resolve(true);
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      log.info('No driver accepted within timeout (this is ok for testing)');
      resolve(true);
    }, 60000);
  });
}

/**
 * Step 5: Track Driver Location
 */
async function testTrackDriver() {
  log.section('STEP 5: Tracking Driver Location');

  return new Promise((resolve) => {
    let locationCount = 0;

    socket.on('driverLocationUpdate', (data) => {
      locationCount++;
      log.data(`📍 Driver location update #${locationCount}: ${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)}`);
    });

    socket.on('rideStatusUpdate', (data) => {
      log.event(`🔄 Ride status changed: ${data.status}`);

      if (data.status === 'ARRIVED') {
        log.success('Driver arrived at pickup location!');
      } else if (data.status === 'STARTED') {
        log.success('Ride started! On your way to destination...');
      } else if (data.status === 'COMPLETED') {
        log.success('🎉 RIDE COMPLETED!');
        log.data(`Total Fare: $${data.fare.totalAmount}`);
        log.data(`Payment Method: ${data.fare.paymentMethod}`);

        // Disconnect after completion
        setTimeout(() => {
          socket.disconnect();
          log.section('✅ ALL CUSTOMER TESTS COMPLETED SUCCESSFULLY');
          process.exit(0);
        }, 3000);

        resolve(true);
      }
    });

    socket.on('rideCancelled', (data) => {
      log.event('⚠️  Ride was cancelled');
      log.data(`Cancelled by: ${data.cancelledBy}`);
      log.data(`Reason: ${data.reason}`);

      setTimeout(() => {
        socket.disconnect();
        process.exit(0);
      }, 2000);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      log.info('Ride tracking timeout (expected if driver test not completing ride)');
      resolve(true);
    }, 120000);
  });
}

/**
 * Optional: Test Cancel Ride
 */
async function testCancelRide() {
  log.section('OPTIONAL: Cancel Ride Test');

  if (!currentRideId) {
    log.info('No active ride to cancel');
    return true;
  }

  return new Promise((resolve) => {
    socket.on('rideCancelledConfirm', (data) => {
      log.success('Ride cancelled successfully');
      log.data(`Ride ID: ${data.rideId}`);
      resolve(true);
    });

    log.info('Emitting cancelRide event...');
    socket.emit('cancelRide', {
      rideId: currentRideId,
      reason: 'Changed my mind'
    });

    // Timeout
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Run all tests
 */
async function runCustomerTests() {
  console.log('\n');
  log.section('👤 UBER CLONE - CUSTOMER SOCKET.IO TEST SUITE 👤');
  console.log('\n');

  try {
    // Login
    const loginSuccess = await loginAsCustomer();
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

    // Request ride
    const requestSuccess = await testRequestRide();
    if (!requestSuccess) {
      throw new Error('Request ride failed');
    }

    await delay(1000);

    // Wait for acceptance
    await testWaitForAcceptance();

    // Track driver
    await testTrackDriver();

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
runCustomerTests();
