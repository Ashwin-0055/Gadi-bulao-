# 🚕 Gadi Bulao - Real-Time Ride Booking Platform

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react)
![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-010101?style=for-the-badge&logo=socketdotio)

**A production-ready, full-stack ride booking application similar to Uber/Ola**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Installation](#-installation) • [API Docs](#-api-documentation)

</div>

---

## 📱 App Preview

| Customer App | Driver App | Live Tracking |
|:---:|:---:|:---:|
| Book rides instantly | Accept ride requests | Real-time GPS tracking |
| Multiple vehicle types | Go online/offline | Live ETA updates |
| Fare estimation | Earnings dashboard | Route navigation |

---

## ✨ Features

### Customer Features
- 📍 **Smart Location Picker** - Draggable map with address autocomplete
- 🚗 **Multiple Vehicle Types** - Bike, Auto, Cab options with fare comparison
- 💰 **Instant Fare Calculation** - Distance-based pricing with Google Maps API
- 📡 **Real-Time Tracking** - Live driver location on map during ride
- 🔔 **Ride Status Updates** - Push notifications for ride lifecycle
- ⭐ **Rating System** - Rate drivers after ride completion

### Driver Features
- 🟢 **Online/Offline Toggle** - Control availability status
- 📨 **Instant Ride Requests** - Real-time notifications for nearby rides
- 🗺️ **Navigation Integration** - Turn-by-turn directions to pickup/dropoff
- 💵 **Earnings Tracker** - Daily/weekly earnings summary
- 🔐 **OTP Verification** - Secure ride start/end with customer OTP

### Technical Features
- 🔄 **Real-Time Communication** - Socket.io for instant updates
- 🌍 **Geospatial Matching** - Zone-based driver discovery using geohashing
- 🔒 **JWT Authentication** - Secure access & refresh token system
- ⚡ **Race Condition Prevention** - Atomic DB operations for ride acceptance
- 📱 **Cross-Platform** - iOS & Android from single codebase

---

## 🛠 Tech Stack

### Mobile App (React Native + Expo)
| Technology | Purpose |
|------------|---------|
| React Native 0.81 | Cross-platform mobile framework |
| Expo SDK 54 | Development & build tooling |
| Expo Router | File-based navigation |
| Zustand | State management |
| Socket.io Client | Real-time communication |
| React Native Maps | Google Maps integration |
| React Native Reanimated | Smooth animations |
| Axios | HTTP client with interceptors |

### Backend (Node.js)
| Technology | Purpose |
|------------|---------|
| Express.js | REST API framework |
| Socket.io | WebSocket server |
| MongoDB Atlas | Cloud database |
| Mongoose | ODM with geospatial indexes |
| JWT | Authentication tokens |
| ngeohash | Zone-based geolocation |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Customer   │  │    Driver    │  │    Shared    │          │
│  │    Screens   │  │   Screens    │  │  Components  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴────────────────┘                   │
│                      │                                          │
│              ┌───────▼───────┐                                 │
│              │  Zustand Store │                                 │
│              │  + Socket.io   │                                 │
│              └───────┬───────┘                                 │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       │ WebSocket + REST API
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Express.js  │  │  Socket.io   │  │    Zone      │          │
│  │   REST API   │  │   Handler    │  │   Manager    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴────────────────┘                   │
│                      │                                          │
│              ┌───────▼───────┐                                 │
│              │   MongoDB     │                                 │
│              │   (Atlas)     │                                 │
│              └───────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Ride Flow
```
Customer                    Server                      Driver
   │                          │                           │
   │──── Request Ride ───────►│                           │
   │                          │──── Broadcast to Zone ───►│
   │                          │                           │
   │                          │◄──── Accept Ride ─────────│
   │◄─── Ride Accepted ───────│                           │
   │                          │                           │
   │◄─── Driver Location ─────│◄──── Update Location ────│
   │         (live)           │         (5s interval)     │
   │                          │                           │
   │                          │◄──── Arrived ────────────│
   │◄─── Status: ARRIVED ─────│                           │
   │                          │                           │
   │     [OTP Verification]   │◄──── Start Ride + OTP ───│
   │◄─── Status: STARTED ─────│                           │
   │                          │                           │
   │◄─── Driver Location ─────│◄──── Update Location ────│
   │         (live)           │                           │
   │                          │                           │
   │                          │◄──── Complete Ride ───────│
   │◄─── Status: COMPLETED ───│                           │
   │     [Show Fare & Rate]   │                           │
```

---

## 📦 Installation

### Prerequisites
- Node.js v18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- MongoDB Atlas account (free tier works)
- Google Maps API key

### 1. Clone Repository
```bash
git clone https://github.com/Ashwin-0055/Gadi-bulao-.git
cd Gadi-bulao-
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your credentials:
# - MONGODB_URI (MongoDB Atlas connection string)
# - JWT_ACCESS_SECRET (generate a secure random string)
# - JWT_REFRESH_SECRET (generate a secure random string)

# Start server
npm start
```

### 3. Mobile App Setup
```bash
cd mobile
npm install

# Update server URL in src/config/environment.ts
# Set your backend URL (local IP for development, production URL for deployment)

# Start Expo
npx expo start
```

### 4. Run on Device
- Install **Expo Go** app on your phone
- Scan QR code from terminal
- Make sure phone and computer are on same WiFi network

---

## 📡 API Documentation

### Authentication

#### Login / Register
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+919999999999",
  "name": "John Doe",
  "role": "customer"  // or "rider"
}
```

#### Register as Driver
```http
POST /api/auth/register-rider
Authorization: Bearer <access_token>

{
  "vehicleType": "cab",
  "vehicleModel": "Swift Dzire",
  "plateNumber": "DL01AB1234",
  "color": "white"
}
```

### Rides

#### Calculate Fare
```http
POST /api/rides/calculate-fare
Authorization: Bearer <access_token>

{
  "pickupLat": 28.6139,
  "pickupLng": 77.2090,
  "dropoffLat": 28.5355,
  "dropoffLng": 77.3910,
  "vehicleType": "cab"
}
```

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `goOnDuty` | Client → Server | Driver goes online |
| `goOffDuty` | Client → Server | Driver goes offline |
| `requestRide` | Client → Server | Customer requests ride |
| `newRideRequest` | Server → Client | Broadcast to nearby drivers |
| `rideAccepted` | Both | Driver accepts, customer notified |
| `updateLocation` | Client → Server | Driver location update |
| `driverLocationUpdate` | Server → Client | Live location to customer |
| `rideArrived` | Client → Server | Driver at pickup |
| `rideStarted` | Client → Server | Ride begins (OTP verified) |
| `rideCompleted` | Client → Server | Ride ends |

---

## 🚀 Deployment

### Backend (Render.com)
1. Push code to GitHub
2. Connect Render to repository
3. Add environment variables
4. Deploy (auto-builds on push)

### Mobile App (APK)
```bash
cd mobile
npx eas build --platform android --profile preview
```

---

## 📊 Database Schema

### User Model
```javascript
{
  phone: String (unique),
  name: String,
  role: ['customer', 'rider'],
  customerProfile: {
    rating: Number,
    totalRides: Number
  },
  riderProfile: {
    isOnDuty: Boolean,
    location: { type: 'Point', coordinates: [lng, lat] },
    vehicle: { type, model, plateNumber, color },
    rating: Number,
    totalRides: Number,
    earnings: Number
  }
}
```

### Ride Model
```javascript
{
  customer: ObjectId,
  rider: ObjectId,
  pickup: { coordinates: GeoJSON, address: String },
  dropoff: { coordinates: GeoJSON, address: String },
  status: ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'],
  vehicleType: ['bike', 'auto', 'cab'],
  fare: { distanceKm, pricePerKm, totalAmount },
  otp: { startOtp, endOtp },
  timestamps: { requestedAt, acceptedAt, arrivedAt, startedAt, completedAt }
}
```

---

## 🔒 Security Features

- ✅ JWT access tokens (15min expiry)
- ✅ Refresh token rotation
- ✅ Socket authentication middleware
- ✅ OTP verification for ride start/end
- ✅ Atomic operations preventing race conditions
- ✅ Input validation & sanitization

---

## 📁 Project Structure

```
Gadi-bulao/
├── mobile/                    # React Native Expo App
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/           # Authentication screens
│   │   ├── (customer)/       # Customer screens
│   │   └── (rider)/          # Driver screens
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── config/           # Environment configuration
│   │   ├── services/         # API & Socket services
│   │   ├── store/            # Zustand state management
│   │   └── types/            # TypeScript definitions
│   └── package.json
│
├── server/                    # Node.js Backend
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth middleware
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Socket & Zone services
│   │   └── utils/            # Helper functions
│   └── package.json
│
└── README.md
```

---

## 👨‍💻 Author

**Ashwin Yadav**

- GitHub: [@Ashwin-0055](https://github.com/Ashwin-0055)

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

</div>
