# Backend Test Suite

Comprehensive test scripts to verify all backend functionality including REST API endpoints and Socket.io real-time events.

## Prerequisites

1. **MongoDB must be running**
   ```bash
   mongod --replSet rs0
   ```

   Initialize replica set (first time only):
   ```bash
   mongosh
   > rs.initiate()
   > exit
   ```

2. **Server must be running**
   ```bash
   cd ../
   npm run dev
   ```
   Server should be running on `http://localhost:3000`

## Test Scripts

### 1. REST API Test (`test-api.js`)

Tests all HTTP endpoints including authentication, fare calculation, and ride management.

**Run:**
```bash
node tests/test-api.js
```

**What it tests:**
- ✅ Server health check
- ✅ Customer login/signup
- ✅ Rider login/signup
- ✅ Rider registration (vehicle details)
- ✅ Get user profile
- ✅ Calculate fare estimates
- ✅ Token refresh (Access + Refresh pattern)
- ✅ Switch role (Customer ↔ Rider)
- ✅ Get ride history
- ✅ Invalid token rejection (security)

**Expected output:**
```
========================================
🧪 UBER CLONE - REST API TEST SUITE 🧪
========================================

✅ Health check passed
✅ Customer login successful
✅ Rider login successful
...

📊 TEST RESULTS SUMMARY
   Total Tests: 10
   Passed: 10
   Failed: 0

🎉 ALL TESTS PASSED! 🎉
```

---

### 2. Driver Socket Test (`test-socket-driver.js`)

Tests driver-side Socket.io events and real-time communication.

**Run:**
```bash
node tests/test-socket-driver.js
```

**What it tests:**
- ✅ Driver authentication via socket
- ✅ Go on duty event
- ✅ Zone subscription (geohashing)
- ✅ Listen for ride requests
- ✅ Accept ride event
- ✅ Send location updates
- ✅ Ride status changes (ARRIVED, STARTED, COMPLETED)
- ✅ Go off duty event

**Note:** This test will wait 30 seconds listening for ride requests. To test the full flow, run the customer test in another terminal while this is running.

**Expected output:**
```
========================================
🚗 UBER CLONE - DRIVER SOCKET.IO TEST SUITE 🚗
========================================

✅ Driver logged in successfully
✅ Connected to Socket.io server
✅ Successfully went on duty
📍 Subscribed to zone: w28r8q
🔔 Listening for ride requests...
```

---

### 3. Customer Socket Test (`test-socket-customer.js`)

Tests customer-side Socket.io events and ride booking flow.

**Run:**
```bash
node tests/test-socket-customer.js
```

**What it tests:**
- ✅ Customer authentication via socket
- ✅ Request ride event
- ✅ Wait for driver acceptance
- ✅ Track driver location updates
- ✅ Receive ride status updates
- ✅ Ride completion flow

**Note:** For best results, run the driver test first in another terminal, then run this test.

**Expected output:**
```
========================================
👤 UBER CLONE - CUSTOMER SOCKET.IO TEST SUITE 👤
========================================

✅ Customer logged in successfully
✅ Connected to Socket.io server
✅ Ride request sent successfully
🎉 DRIVER ACCEPTED YOUR RIDE!
📍 Received driver location
🔄 Ride status changed: COMPLETED
```

---

### 4. Full Ride Flow Test (`test-full-ride-flow.js`) ⭐ **RECOMMENDED**

Complete end-to-end test simulating both customer and driver in a single script.

**Run:**
```bash
node tests/test-full-ride-flow.js
```

**What it tests:**
- ✅ Complete ride lifecycle from request to completion
- ✅ Customer and driver interaction simultaneously
- ✅ All socket events in sequence
- ✅ Real-time location tracking
- ✅ Status transitions: SEARCHING → ACCEPTED → ARRIVED → STARTED → COMPLETED

**This is the most comprehensive test!**

**Expected output:**
```
========================================
🚀 COMPLETE END-TO-END RIDE FLOW TEST 🚀
========================================

PHASE 1: Customer Connecting
👤 [CUSTOMER] Connected to server

PHASE 2: Driver Connecting and Going On Duty
🚗 [DRIVER] Connected to server
🚗 [DRIVER] Went on duty successfully

PHASE 3: Driver Subscribing to Zone
🚗 [DRIVER] Subscribed to zone: w28r8q

PHASE 4: Customer Requesting Ride
👤 [CUSTOMER] Ride requested successfully
🚗 [DRIVER] 📣 NEW RIDE REQUEST RECEIVED!

PHASE 5: Driver Accepting Ride
🚗 [DRIVER] Ride acceptance confirmed
👤 [CUSTOMER] 🎉 Driver accepted the ride!

PHASE 6: Driver Sending Location Updates
🚗 [DRIVER] Sending location update #1
👤 [CUSTOMER] 📍 Received driver location

PHASE 7: Driver Arrived at Pickup
👤 [CUSTOMER] Driver has arrived at pickup!

PHASE 8: Ride Started
👤 [CUSTOMER] Ride has started! On the way...

PHASE 9: Ride Completed
👤 [CUSTOMER] 🎉 Ride completed successfully!
🚗 [DRIVER] Ride completion confirmed

✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅
```

---

## Testing Workflow

### Quick Test (5 minutes)
```bash
# 1. Start MongoDB
mongod --replSet rs0

# 2. Start server (in another terminal)
cd server
npm run dev

# 3. Run REST API test
node tests/test-api.js

# 4. Run full ride flow test
node tests/test-full-ride-flow.js
```

### Manual Interactive Test
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Start driver
node tests/test-socket-driver.js

# Terminal 3: Start customer (while driver is running)
node tests/test-socket-customer.js
```

Watch both terminals to see real-time bidirectional communication!

---

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"
- **Issue:** Server is not running
- **Fix:** Start the server with `npm run dev`

### "MongoServerError: Replica set"
- **Issue:** MongoDB not initialized as replica set
- **Fix:**
  ```bash
  mongosh
  > rs.initiate()
  ```

### "Authentication failed" or "Invalid token"
- **Issue:** Token expired or invalid
- **Fix:** This is expected behavior! The test creates new tokens automatically.

### Driver doesn't receive ride requests
- **Issue:** Timing issue or zone mismatch
- **Fix:** Use `test-full-ride-flow.js` which handles timing automatically

### Tests timeout
- **Issue:** Server not responding
- **Fix:** Check server logs for errors. Ensure MongoDB is connected.

---

## What Each Test Validates

| Test | REST API | Socket.io | Geospatial | Auth | Real-time |
|------|----------|-----------|------------|------|-----------|
| test-api.js | ✅ | ❌ | ❌ | ✅ | ❌ |
| test-socket-driver.js | ❌ | ✅ | ✅ | ✅ | ✅ |
| test-socket-customer.js | ❌ | ✅ | ❌ | ✅ | ✅ |
| test-full-ride-flow.js | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Production Testing Checklist

Before deploying to production, ensure:

- [ ] All REST API tests pass (10/10)
- [ ] Driver socket test passes
- [ ] Customer socket test passes
- [ ] Full ride flow test completes successfully
- [ ] MongoDB replica set is configured
- [ ] JWT secrets are changed from defaults
- [ ] Server responds to health check
- [ ] Geospatial indexes are created
- [ ] No errors in server logs during tests

---

## Next Steps

After all tests pass:
1. ✅ Backend is production-ready
2. 🚀 Proceed to build mobile app (Phase 2)
3. 📱 Test mobile app with this backend
4. 🎯 Deploy to production server

---

**Happy Testing! 🧪**
