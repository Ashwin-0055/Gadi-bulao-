# 🚀 Quick Start Guide

## Step 1: Start MongoDB

**Windows:**
```bash
# Option 1: If MongoDB is installed as a service
net start MongoDB

# Option 2: Manual start with replica set
mongod --replSet rs0 --dbpath "C:\data\db"
```

**Mac/Linux:**
```bash
mongod --replSet rs0
```

**First time only - Initialize replica set:**
```bash
mongosh
> rs.initiate()
> exit
```

## Step 2: Start the Server

```bash
cd server
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
✅ Server running on port 3000
✅ Socket.io ready for connections
```

## Step 3: Run Tests

### Quick Test (Recommended)
```bash
node tests/test-full-ride-flow.js
```

This runs a complete end-to-end test simulating both customer and driver.

### All Tests
```bash
# Test REST API
node tests/test-api.js

# Test full ride flow
node tests/test-full-ride-flow.js
```

## If MongoDB is not installed

**Download MongoDB:**
- Windows: https://www.mongodb.com/try/download/community
- Mac: `brew install mongodb-community`
- Linux: See MongoDB docs for your distro

**Or use MongoDB Atlas (cloud):**
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `server/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uber-clone
   ```

## Next Steps

After tests pass:
1. ✅ Backend is ready
2. 📱 Build mobile app (Phase 2)
3. 🚀 Deploy to production

## Troubleshooting

**"MongoServerError: Replica set"**
- Run: `mongosh` → `rs.initiate()` → `exit`

**"ECONNREFUSED"**
- Make sure MongoDB is running
- Check connection string in `.env`

**Tests fail**
- Ensure server is running (`npm run dev`)
- Check server logs for errors
- Verify MongoDB is connected

## Support

Check `server/tests/README.md` for detailed test documentation.
