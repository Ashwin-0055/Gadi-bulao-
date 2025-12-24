# Gadi Bulao

A ride-hailing app for booking cabs, autos, and bikes. Built with React Native (Expo) and Node.js.

## Features

**For Customers:**
- Book rides with pickup/drop location
- Choose vehicle type (Bike, Auto, Cab)
- Real-time driver tracking
- Fare estimation before booking

**For Drivers:**
- Go online/offline
- Accept ride requests
- Navigation to pickup & drop
- Track earnings

## Tech Stack

- **Mobile:** React Native, Expo SDK 54, Zustand
- **Backend:** Node.js, Express, Socket.io, MongoDB
- **Maps:** Google Maps API
- **Auth:** Email OTP (Brevo)

## Quick Start

### Backend
```bash
cd server
npm install
cp .env.example .env   # Add your MongoDB URI, JWT secrets, Brevo API key
npm start
```

### Mobile App
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

## Project Structure

```
├── mobile/          # React Native app
│   ├── app/         # Screens (customer, rider, auth)
│   └── src/         # Components, services, store
│
└── server/          # Node.js backend
    └── src/         # Routes, controllers, models
```

## Screenshots

| Home | Booking | Live Ride |
|:----:|:-------:|:---------:|
| Dark themed UI | Vehicle selection | Real-time tracking |

## Environment Variables

**Server (.env):**
```
MONGODB_URI=your_mongodb_uri
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
BREVO_API_KEY=your_brevo_key
```

## Author

**Ashwin Yadav** - [@Ashwin-0055](https://github.com/Ashwin-0055)

## License

MIT
