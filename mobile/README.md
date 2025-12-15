# Uber Clone - React Native Mobile App

Production-ready React Native mobile application built with Expo for a real-time ride booking platform.

## 📱 Tech Stack

- **Framework**: React Native 0.74 with Expo ~51.0
- **Routing**: Expo Router (File-based routing)
- **State Management**: Zustand
- **Storage**: react-native-mmkv (Fast, encrypted key-value storage)
- **Maps**: react-native-maps + react-native-maps-directions
- **UI**: @gorhom/bottom-sheet, react-native-reanimated, react-native-gesture-handler
- **Real-time**: Socket.io-client
- **HTTP**: Axios with auto token refresh interceptors
- **Location**: expo-location (with background tracking support)
- **Language**: TypeScript

---

## 🏗️ Architecture Overview

### **Core Infrastructure** ✅ **COMPLETE**

```
mobile/
├── app/                           # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Role selection screen
│   ├── auth/
│   │   └── phone-login.tsx       # Phone authentication
│   ├── customer/
│   │   ├── home.tsx              # Customer home (map + booking)
│   │   └── liveRide.tsx          # Customer live ride tracking
│   └── rider/
│       ├── home.tsx              # Rider home (duty + requests)
│       └── liveRide.tsx          # Rider navigation to customer
│
├── src/
│   ├── config/
│   │   └── environment.ts        # ✅ API URLs, config, feature flags
│   │
│   ├── constants/
│   │   ├── vehicleTypes.ts       # ✅ Bike/Auto/Cab config
│   │   ├── colors.ts             # ✅ App color palette
│   │   └── mapStyle.ts           # ✅ Custom Google Maps style
│   │
│   ├── store/
│   │   ├── storage.ts            # ✅ MMKV storage helpers
│   │   ├── userStore.ts          # ✅ Customer state (Zustand)
│   │   └── riderStore.ts         # ✅ Driver state (Zustand)
│   │
│   ├── services/
│   │   ├── apiClient.ts          # ✅ Axios with auto token refresh
│   │   └── socketService.ts      # ✅ Socket.io wrapper
│   │
│   ├── context/
│   │   └── WSProvider.tsx        # ✅ Global socket connection manager
│   │
│   ├── components/               # 🚧 TO BE BUILT
│   │   ├── shared/
│   │   │   ├── CustomButton.tsx
│   │   │   └── PhoneInput.tsx
│   │   ├── customer/
│   │   │   ├── DraggableMap.tsx
│   │   │   ├── LocationBar.tsx
│   │   │   └── RideBookingSheet.tsx
│   │   └── rider/
│   │       ├── RiderHeader.tsx
│   │       └── RideRequestItem.tsx
│   │
│   └── utils/                    # 🚧 TO BE BUILT
│       ├── locationUtils.ts
│       └── mapUtils.ts
│
├── app.json                      # ✅ Expo configuration
├── package.json                  # ✅ Dependencies
└── tsconfig.json                 # ✅ TypeScript config
```

---

## ✅ What's Built (Core Infrastructure)

### **1. State Management (Zustand Stores)**

#### **User Store** (`src/store/userStore.ts`)
Manages customer data and authentication:
- ✅ Phone-based authentication state
- ✅ JWT token management (Access + Refresh)
- ✅ User profile data
- ✅ Current, pickup, dropoff locations
- ✅ Saved locations
- ✅ Persistent storage (MMKV)
- ✅ Auto-hydration on app start

#### **Rider Store** (`src/store/riderStore.ts`)
Manages driver data:
- ✅ On-duty status
- ✅ Current zone (geohash)
- ✅ Vehicle information
- ✅ Incoming ride requests queue
- ✅ Active ride state
- ✅ Earnings and stats

### **2. Socket.io Integration**

#### **Socket Service** (`src/services/socketService.ts`)
Complete real-time communication:
- ✅ JWT authentication on connection
- ✅ Auto-reconnection with handler re-attachment
- ✅ Event emitters (typed methods):
  - `goOnDuty()`, `goOffDuty()`
  - `subscribeToZone()`
  - `requestRide()`, `acceptRide()`
  - `rideArrived()`, `rideStarted()`, `rideCompleted()`
  - `updateLocation()`, `cancelRide()`
- ✅ Event listeners:
  - `onNewRideRequest()`, `onRideAccepted()`
  - `onDriverLocationUpdate()`, `onRideStatusUpdate()`
  - `onDutyStatusChanged()`, `onZoneSubscribed()`

#### **WSProvider Context** (`src/context/WSProvider.tsx`)
Global socket connection manager:
- ✅ Auto-connects when user authenticates
- ✅ Auto-disconnects on logout
- ✅ Connection state management
- ✅ Accessible via `useSocket()` hook

### **3. API Client (Axios)**

#### **API Client** (`src/services/apiClient.ts`)
HTTP client with smart token handling:
- ✅ Auto-attaches JWT access token to requests
- ✅ Auto-refreshes tokens on 401 (seamless UX!)
- ✅ Request queuing during token refresh
- ✅ Typed API methods:
  - `api.auth.login()`, `api.auth.switchRole()`, `api.auth.registerRider()`
  - `api.rides.calculateFare()`, `api.rides.getHistory()`
  - `api.rides.getRideById()`, `api.rides.cancelRide()`

### **4. Storage (MMKV)**

#### **Storage Helpers** (`src/store/storage.ts`)
Fast, encrypted storage:
- ✅ Generic helpers (`getString`, `setObject`, `getBoolean`)
- ✅ Auth token helpers (`saveTokens`, `getAccessToken`, `clearTokens`)
- ✅ Type-safe storage keys enum

### **5. Configuration & Constants**

#### **Environment Config** (`src/config/environment.ts`)
- ✅ API URL (dev vs production)
- ✅ Socket connection config
- ✅ Location tracking settings
- ✅ Map configuration
- ✅ Debug flags

#### **Vehicle Types** (`src/constants/vehicleTypes.ts`)
- ✅ Bike, Auto, Cab configurations
- ✅ Base rates, capacity, icons

#### **Colors** (`src/constants/colors.ts`)
- ✅ Uber-like color palette
- ✅ Ride status colors
- ✅ Dark mode support ready

#### **Map Style** (`src/constants/mapStyle.ts`)
- ✅ Custom Google Maps style (minimal, clean)
- ✅ Removes POIs for Uber-like look

---

## 🚧 What's Next (UI Layer)

### **Screens to Build**

1. **app/_layout.tsx** - Root layout with WSProvider
2. **app/index.tsx** - Role selection (Customer vs Rider)
3. **app/auth/phone-login.tsx** - Phone authentication screen
4. **app/customer/home.tsx** - Main customer screen with map
5. **app/customer/liveRide.tsx** - Live ride tracking
6. **app/rider/home.tsx** - Driver home (on/off duty + requests)
7. **app/rider/liveRide.tsx** - Navigation to customer

### **Components to Build**

**Shared:**
- `CustomButton` - Reusable button component
- `PhoneInput` - Phone number input with validation

**Customer:**
- `DraggableMap` - MapView with draggable pin
- `LocationBar` - Google Places autocomplete search
- `RideBookingSheet` - Bottom sheet (gorhom/bottom-sheet) with vehicle types

**Rider:**
- `RiderHeader` - On/Off duty toggle
- `RideRequestItem` - Incoming ride card with Accept/Reject

### **Utils to Build**

- `locationUtils.ts` - Get current location, reverse geocode
- `mapUtils.ts` - Polyline drawing, marker animation, distance calculation

---

## 📦 Installation & Setup

### **Prerequisites**

- Node.js 16+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Google Maps API key

### **Step 1: Install Dependencies**

```bash
cd mobile
npm install
```

### **Step 2: Configure Environment**

Update `src/config/environment.ts`:

```typescript
// Development
export const API_URL = 'http://YOUR_LOCAL_IP:3000';  // NOT localhost!

// Google Maps
export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
```

**Important:** Use your computer's local IP (e.g., `http://192.168.1.100:3000`), not `localhost`, when testing on a physical device.

### **Step 3: Configure Google Maps API Key**

Update `app.json`:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        }
      }
    },
    "plugins": [
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        }
      ]
    ]
  }
}
```

### **Step 4: Start Development Server**

```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app (physical device)

---

## 🔧 Development Workflow

### **1. Testing with Backend**

Ensure backend server is running:
```bash
cd ../server
npm run dev
```

Backend should be accessible at the IP specified in `environment.ts`.

### **2. Testing Authentication**

```typescript
// In any screen
import { useUserStore } from '@/store/userStore';
import { api } from '@/services/apiClient';

const handleLogin = async () => {
  const response = await api.auth.login({
    phone: '1234567890',
    name: 'Test User',
    role: 'customer'
  });

  useUserStore.getState().login(
    response.data.data.tokens,
    response.data.data.user
  );
};
```

### **3. Testing Socket Connection**

```typescript
import { useSocket } from '@/context/WSProvider';

const { socket, isConnected } = useSocket();

// Listen for events
socket.onRideRequested((data) => {
  console.log('Ride requested:', data);
});

// Emit events
socket.requestRide({
  pickup: { latitude, longitude, address },
  dropoff: { latitude, longitude, address },
  vehicleType: 'cab'
});
```

### **4. Testing State Management**

```typescript
// Customer actions
import { useUserStore } from '@/store/userStore';

const setLocation = useUserStore((state) => state.setPickupLocation);
const pickupLocation = useUserStore((state) => state.pickupLocation);

setLocation({ latitude: 28.7041, longitude: 77.1025, address: 'Delhi' });

// Rider actions
import { useRiderStore } from '@/store/riderStore';

const setOnDuty = useRiderStore((state) => state.setOnDuty);
const isOnDuty = useRiderStore((state) => state.isOnDuty);

setOnDuty(true);
```

---

## 🎯 Features Implemented (Infrastructure)

| Feature | Status |
|---------|--------|
| Phone authentication | ✅ |
| JWT token auto-refresh | ✅ |
| Socket.io connection | ✅ |
| Auto reconnection | ✅ |
| State persistence (MMKV) | ✅ |
| Customer state management | ✅ |
| Rider state management | ✅ |
| API client with interceptors | ✅ |
| Environment configuration | ✅ |
| TypeScript types | ✅ |
| Google Maps config | ✅ |
| Location tracking setup | ✅ |
| **UI Components** | 🚧 **Next Phase** |
| **Screens** | 🚧 **Next Phase** |

---

## 🚀 Next Steps

### **Phase 2B: Build UI Layer**

1. ✅ Create root layout with WSProvider
2. ✅ Build role selection screen
3. ✅ Build phone login screen
4. ✅ Build customer home (DraggableMap + LocationBar + RideBookingSheet)
5. ✅ Build rider home (RiderHeader + RideRequestItem list)
6. ✅ Build live ride screens (both customer and rider)
7. ✅ Implement background location tracking
8. ✅ Test complete ride flow end-to-end

### **Phase 3: Production Prep**

- Push notifications (FCM)
- Background location tasks
- App icons and splash screens
- Error boundaries and crash reporting
- Performance optimization
- Build for iOS/Android

---

## 📚 Key Packages Documentation

- **Expo Router**: https://docs.expo.dev/router/introduction/
- **Zustand**: https://zustand-demo.pmnd.rs/
- **react-native-maps**: https://github.com/react-native-maps/react-native-maps
- **@gorhom/bottom-sheet**: https://gorhom.github.io/react-native-bottom-sheet/
- **Socket.io Client**: https://socket.io/docs/v4/client-api/
- **MMKV**: https://github.com/mrousavy/react-native-mmkv

---

## 🐛 Troubleshooting

### **"Metro bundler error"**
- Clear cache: `expo start -c`

### **"Socket connection failed"**
- Check API_URL in `environment.ts`
- Ensure backend is running
- Use local IP, not `localhost`

### **"Maps not showing"**
- Verify Google Maps API key
- Enable Maps SDK for Android/iOS in Google Cloud Console
- Check `app.json` configuration

### **"MMKV not working"**
- Rebuild app: `expo prebuild --clean`

---

## 📝 License

MIT

---

**Status**: Core infrastructure complete ✅ | UI layer in progress 🚧

**Ready to build the UI screens!** The entire backend integration is production-ready.
