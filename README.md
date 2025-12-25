# Gadi Bulao

A ride-hailing app for booking cabs, autos, and bikes. Built with React Native (Expo) and Node.js.

## Live Demo

- **Backend API:** https://gadi-bulao-backend.onrender.com
- **Admin Panel:** https://gadi-bulao-backend.onrender.com/admin
- **Health Check:** https://gadi-bulao-backend.onrender.com/health

## Features

### For Customers
- Book rides with pickup/drop location selection
- Choose vehicle type (Bike, Auto, Cab)
- Real-time driver tracking on map
- Fare estimation before booking
- OTP verification for ride start/end
- Rating system after ride completion

### For Drivers
- Go online/offline toggle
- Accept/reject ride requests
- Turn-by-turn navigation to pickup & drop
- OTP verification system
- Track earnings and completed rides
- Zone-based ride matching

### Admin Panel
- View all active rides in real-time
- Manage users and drivers
- Dashboard with statistics
- Cancel/modify rides

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Mobile** | React Native, Expo SDK 54, TypeScript, Zustand |
| **Backend** | Node.js, Express.js, Socket.io, MongoDB |
| **Maps** | OpenStreetMap, Leaflet (Web), react-native-maps (Native) |
| **Auth** | Email OTP (Brevo), JWT Tokens |
| **Real-time** | Socket.io for live updates |
| **Hosting** | Render (Backend), EAS Build (Mobile) |

## Project Structure

```
Gadi-bulao/
├── mobile/                 # React Native Expo app
│   ├── app/               # Expo Router screens
│   │   ├── auth/          # Login screens
│   │   ├── customer/      # Customer home & live ride
│   │   └── rider/         # Driver home & live ride
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── services/      # API & Socket services
│       ├── store/         # Zustand state management
│       └── context/       # React context providers
│
└── server/                # Node.js backend
    └── src/
        ├── controllers/   # API logic
        ├── models/        # MongoDB schemas
        ├── routes/        # Express routes
        ├── services/      # Socket & zone services
        └── public/        # Admin panel HTML
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Backend Setup
```bash
cd server
npm install
cp .env.example .env   # Configure your environment variables
npm start
```

### Mobile App Setup
```bash
cd mobile
npm install
npx expo start
```

### Build APK
```bash
cd mobile
npx eas build --platform android --profile preview
```

## Environment Variables

### Server (.env)
```env
# Database
MONGODB_URI=mongodb+srv://your-connection-string

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email OTP (Brevo)
BREVO_API_KEY=your-brevo-api-key

# Optional: Google Maps (for better routing)
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP and login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/profile` | Get user profile |
| POST | `/api/auth/register-rider` | Register as driver |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rides/calculate-fare` | Get fare estimate |
| GET | `/api/rides/history` | Get ride history |
| GET | `/api/rides/active` | Get active rides (admin) |

## Socket Events

### Customer Events
- `requestRide` - Book a new ride
- `cancelRide` - Cancel current ride

### Driver Events
- `goOnDuty` / `goOffDuty` - Toggle availability
- `rideAccepted` - Accept a ride request
- `rideArrived` - Mark arrival at pickup
- `rideStarted` - Start ride (with OTP)
- `rideCompleted` - Complete ride (with OTP)
- `updateLocation` - Send live location

## Fare Structure

| Vehicle | Base Fare | Per KM | Minimum |
|---------|-----------|--------|---------|
| Bike | ₹20 | ₹8 | ₹30 |
| Auto | ₹30 | ₹12 | ₹50 |
| Cab | ₹50 | ₹15 | ₹80 |

## Screenshots

| Customer Home | Driver Home | Live Ride |
|:-------------:|:-----------:|:---------:|
| Dark themed map | Duty toggle | Real-time tracking |

## Author

**Ashwin Yadav** - [@Ashwin-0055](https://github.com/Ashwin-0055)

## Contact

Have questions or want to collaborate? Reach out!

- **Email:** hustlerashwin2400@gmail.com
- **GitHub:** [@Ashwin-0055](https://github.com/Ashwin-0055)

## License

MIT
