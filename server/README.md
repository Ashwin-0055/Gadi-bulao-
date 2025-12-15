# Uber Clone - Backend Server

Production-grade Node.js backend for a real-time ride booking application with Socket.io for live communication between riders and customers.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT (Access + Refresh tokens)
- **Geospatial**: MongoDB 2dsphere indexes + ngeohash

## Features

### Core Functionality
- Phone-based authentication with JWT
- Role-based system (Customer & Rider)
- Real-time bidirectional communication
- Geospatial zone-based driver discovery
- Ride lifecycle management (SEARCHING → ACCEPTED → ARRIVED → STARTED → COMPLETED)
- Background location tracking support
- Cash payment mode (no payment gateway integration)

### Architecture Highlights
- **Zone-based Broadcasting**: Uses geohashing to efficiently notify nearby drivers
- **Race Condition Prevention**: Atomic database updates prevent multiple drivers accepting the same ride
- **Socket Reconnection Handling**: Maintains state across network interruptions
- **Scalable Design**: Ready for Redis integration for multi-server deployment

## Installation

### Prerequisites
- Node.js v16+
- MongoDB v5+ (with replication for geospatial queries)
- Google Maps API key (for directions and geocoding)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` file**
   - Set your MongoDB connection string
   - Add Google Maps API key
   - Configure JWT secrets (change default values!)

4. **Start MongoDB** (if running locally)
   ```bash
   mongod --replSet rs0
   ```
   Initialize replica set (required for geospatial queries):
   ```bash
   mongosh
   > rs.initiate()
   ```

5. **Start server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Phone-based login (creates user if not exists)
```json
{
  "phone": "1234567890",
  "name": "John Doe",
  "role": "customer"
}
```

#### POST `/api/auth/refresh`
Refresh access token
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### POST `/api/auth/register-rider`
Register as a rider (requires authentication)
```json
{
  "vehicleType": "bike",
  "vehicleModel": "Honda Activa",
  "plateNumber": "DL01AB1234",
  "color": "black"
}
```

#### POST `/api/auth/switch-role`
Switch between customer and rider mode
```json
{
  "role": "rider"
}
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication)

### Rides

#### POST `/api/rides/calculate-fare`
Calculate fare estimate for a route
```json
{
  "pickupLat": 28.7041,
  "pickupLng": 77.1025,
  "dropoffLat": 28.5355,
  "dropoffLng": 77.3910,
  "vehicleType": "cab"
}
```

#### GET `/api/rides/history?role=customer&limit=20&page=1`
Get ride history for current user

#### GET `/api/rides/:rideId`
Get ride details by ID

#### POST `/api/rides/:rideId/cancel`
Cancel a ride
```json
{
  "reason": "Changed plans"
}
```

## Socket.io Events

### Driver Events (Emit)

#### `goOnDuty`
```javascript
socket.emit('goOnDuty', {
  latitude: 28.7041,
  longitude: 77.1025,
  vehicleType: 'bike'
});
```

#### `goOffDuty`
```javascript
socket.emit('goOffDuty');
```

#### `subscribeToZone`
```javascript
socket.emit('subscribeToZone', {
  latitude: 28.7041,
  longitude: 77.1025
});
```

#### `rideAccepted`
```javascript
socket.emit('rideAccepted', {
  rideId: '507f1f77bcf86cd799439011'
});
```

#### `updateLocation`
```javascript
socket.emit('updateLocation', {
  rideId: '507f1f77bcf86cd799439011',
  latitude: 28.7041,
  longitude: 77.1025
});
```

#### `rideArrived`, `rideStarted`, `rideCompleted`
```javascript
socket.emit('rideArrived', { rideId: '...' });
socket.emit('rideStarted', { rideId: '...' });
socket.emit('rideCompleted', { rideId: '...' });
```

### Customer Events (Emit)

#### `requestRide`
```javascript
socket.emit('requestRide', {
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
  vehicleType: 'cab'
});
```

#### `cancelRide`
```javascript
socket.emit('cancelRide', {
  rideId: '507f1f77bcf86cd799439011',
  reason: 'Changed plans'
});
```

### Server Events (Listen)

#### Driver Listeners
- `newRideRequest` - New ride request in driver's zone
- `rideUnavailable` - Ride already accepted by another driver
- `rideCancelled` - Customer cancelled the ride
- `dutyStatusChanged` - Confirmation of duty status change
- `zoneSubscribed` - Confirmation of zone subscription

#### Customer Listeners
- `rideAccepted` - Driver accepted the ride
- `driverLocationUpdate` - Real-time driver location updates
- `rideStatusUpdate` - Ride status changes
- `rideCancelled` - Driver cancelled the ride

## Database Schema

### User Model
```javascript
{
  phone: String (unique),
  name: String,
  role: ['customer', 'rider'],
  activeRole: 'customer' | 'rider',
  riderProfile: {
    vehicle: { type, model, plateNumber, color },
    location: { type: 'Point', coordinates: [lng, lat] }, // 2dsphere indexed
    isOnDuty: Boolean,
    currentZone: String,
    rating: Number,
    totalRides: Number,
    earnings: Number
  },
  customerProfile: {
    savedLocations: [...],
    rating: Number,
    totalRides: Number
  }
}
```

### Ride Model
```javascript
{
  customer: ObjectId (ref: User),
  rider: ObjectId (ref: User),
  pickup: { coordinates: { type: 'Point', coordinates: [] }, address },
  dropoff: { coordinates: { type: 'Point', coordinates: [] }, address },
  vehicleType: 'bike' | 'auto' | 'cab',
  status: 'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED',
  fare: { distanceKm, pricePerKm, totalAmount, paymentMethod: 'cash' },
  route: { polyline, durationMin },
  timestamps: { requestedAt, acceptedAt, arrivedAt, startedAt, completedAt }
}
```

## Testing

### Using Postman

1. **Test Authentication**
   ```
   POST http://localhost:3000/api/auth/login
   ```

2. **Test Fare Calculation**
   ```
   POST http://localhost:3000/api/auth/calculate-fare
   Authorization: Bearer <access-token>
   ```

### Using Socket.io Client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: 'your-access-token' },
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected!'));
socket.on('newRideRequest', (data) => console.log('New ride:', data));

socket.emit('goOnDuty', { latitude: 28.7041, longitude: 77.1025 });
```

## Production Deployment

### Environment Variables Checklist
- [ ] Change JWT secrets from default values
- [ ] Set MongoDB connection string (with authentication)
- [ ] Add Google Maps API key with appropriate restrictions
- [ ] Set NODE_ENV=production
- [ ] Configure CORS origin to match your mobile app

### Recommended Setup
- Use MongoDB Atlas or managed MongoDB instance
- Deploy on AWS EC2, DigitalOcean, or Heroku
- Use PM2 for process management
- Set up Redis for multi-server socket synchronization (future)
- Enable MongoDB replica set for geospatial queries

### PM2 Deployment
```bash
npm install -g pm2
pm2 start src/index.js --name uber-clone-server
pm2 save
pm2 startup
```

## Architecture Decisions

### Why Geohashing?
- **Efficiency**: O(1) zone lookup instead of scanning all drivers
- **Scalability**: Easily handle 10,000+ concurrent drivers
- **Precision**: Configurable granularity (default: ~1.2km x 0.6km)

### Why Zone + Neighbors?
Prevents edge cases where a driver is 100m away but in a different zone due to geohash boundaries.

### Why Atomic Updates?
Prevents race conditions when multiple drivers accept the same ride simultaneously.

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --replSet rs0`
- Initialize replica set: `mongosh` → `rs.initiate()`
- Check connection string in `.env`

### Socket Authentication Failures
- Verify JWT token is valid and not expired
- Check `Authorization: Bearer <token>` header format
- Ensure token is sent in `socket.handshake.auth.token`

### Geospatial Queries Not Working
- Ensure MongoDB replica set is initialized
- Verify 2dsphere index exists: `db.users.getIndexes()`
- Check coordinates are in [longitude, latitude] order

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
