# 🚗 Gadi Bulao - Ride Hailing App

A production-ready ride-hailing application for booking **Bikes, Autos, and Cabs** with real-time driver tracking, OTP verification, and complete admin management.

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue?logo=react)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black?logo=socket.io)](https://socket.io/)

---

## 📱 Try the App

| Download | Link |
|----------|------|
| **Android APK** | [⬇️ Download Latest APK](https://expo.dev/accounts/ashwin.yadav/projects/gadi-bulao/builds/879ea332-bdac-418d-90c6-3e29682722f9) |
| **Admin Panel** | [🔗 Open Admin Dashboard](https://gadi-bulao-backend.onrender.com/admin) |

> **Note:** First API request may take 30-50 seconds (free tier server wake-up time)

---

## 🎬 Demo Videos

### Customer - Login & Booking Flow
https://github.com/user-attachments/assets/0eb6113e-df4a-49f2-849b-bc815b354383

### Driver - Going Online & Accepting Rides
https://github.com/user-attachments/assets/b096c903-0f00-4797-9125-0a577e62e1ba

### Driver - Completing a Ride
https://github.com/user-attachments/assets/1c76336e-bb30-4b2c-9c2f-6fa5bbb56d6c

### Admin Panel - Managing Rides & Users
https://github.com/user-attachments/assets/8903acea-71b5-493b-9aa9-eb08fde9b58e

---

## 📖 How to Test the App

### Step 1: Download & Install
1. Download the APK from the link above
2. Install on your Android device (allow installation from unknown sources)
3. Open the app

### Step 2: Test as Customer
1. **Login** → Enter your email → Receive OTP → Verify
2. **Set Pickup** → Tap on map or use "Current Location"
3. **Set Dropoff** → Search or tap on map
4. **Choose Vehicle** → Select Bike, Auto, or Cab
5. **Book Ride** → Wait for driver to accept
6. **Track Driver** → Watch real-time location on map
7. **Share OTP** → Give Start OTP to driver when they arrive
8. **Complete Ride** → Share End OTP at destination
9. **Rate Driver** → Give feedback

### Step 3: Test as Driver
1. **Login** → Same email login process
2. **Register as Driver** → Go to Profile → "Become a Driver"
3. **Enter Vehicle Details** → Type, Number, Model
4. **Go Online** → Toggle the duty switch
5. **Receive Requests** → Accept ride requests that appear
6. **Navigate to Pickup** → Follow the route on map
7. **Mark Arrived** → Tap "I've Arrived" at pickup
8. **Enter Start OTP** → Get 4-digit code from customer
9. **Start Ride** → Navigate to dropoff
10. **Enter End OTP** → Complete the ride
11. **Earn Money** → See earnings in your dashboard

### Step 4: Test Admin Panel
1. Open [Admin Panel](https://gadi-bulao-backend.onrender.com/admin)
2. Enter API Key when prompted
3. View active rides, users, and drivers
4. Manage rides (cancel, update status)

---

## ✨ Key Features

| Customer App | Driver App | Admin Panel |
|-------------|-----------|-------------|
| Book Bike/Auto/Cab | Go Online/Offline | View All Rides |
| Live Driver Tracking | Accept/Reject Rides | Manage Users |
| Fare Estimation | Turn-by-turn Navigation | Manage Drivers |
| OTP Verification | OTP Verification | Cancel Rides |
| Rate Drivers | Track Earnings | Update Status |
| Ride History | Ride History | Real-time Updates |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Mobile App** | React Native, Expo SDK 54, TypeScript |
| **State Management** | Zustand with AsyncStorage persistence |
| **Backend API** | Node.js, Express.js |
| **Database** | MongoDB Atlas |
| **Real-time** | Socket.io (WebSocket) |
| **Maps** | OpenStreetMap, Leaflet.js |
| **Authentication** | Email OTP (Brevo), JWT Tokens |
| **Security** | Helmet.js, Rate Limiting, API Keys |

---

## 🏗️ Architecture

```
┌──────────────────┐         ┌──────────────────┐
│   Customer App   │◄───────►│    Driver App    │
│  (React Native)  │         │  (React Native)  │
└────────┬─────────┘         └────────┬─────────┘
         │         Socket.io          │
         │        (Real-time)         │
         ▼                            ▼
┌─────────────────────────────────────────────────┐
│               Node.js Backend                   │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ REST API │  │ Socket.io │  │  MongoDB    │  │
│  │ Express  │  │  Server   │  │  Database   │  │
│  └──────────┘  └───────────┘  └─────────────┘  │
└─────────────────────────────────────────────────┘
                      ▲
                      │
         ┌────────────┴────────────┐
         │      Admin Panel        │
         │    (HTML/CSS/JS)        │
         └─────────────────────────┘
```

---

## 💰 Fare Structure

| Vehicle | Base Fare | Per KM | Minimum |
|---------|-----------|--------|---------|
| 🏍️ Bike | ₹20 | ₹8/km | ₹30 |
| 🛺 Auto | ₹30 | ₹12/km | ₹50 |
| 🚗 Cab | ₹50 | ₹15/km | ₹80 |

---

## 📁 Project Structure

```
Gadi-bulao/
├── mobile/                 # React Native Expo App
│   ├── app/               # Screens (Expo Router)
│   │   ├── auth/          # Login & OTP Verification
│   │   ├── customer/      # Customer Home & Live Ride
│   │   └── rider/         # Driver Home & Live Ride
│   └── src/
│       ├── components/    # Reusable UI Components
│       ├── services/      # API & Socket Services
│       └── store/         # Zustand State Management
│
├── server/                # Node.js Backend
│   └── src/
│       ├── controllers/   # Business Logic
│       ├── models/        # MongoDB Schemas
│       ├── routes/        # API Endpoints
│       ├── services/      # Socket & Zone Services
│       └── public/        # Admin Panel
│
└── demo/                  # Demo Videos
```

---

## 🔒 Security Features

- **OTP Verification** - Ride start and completion require OTP
- **JWT Authentication** - Secure token-based auth with refresh tokens
- **Rate Limiting** - Protection against abuse
- **API Key Auth** - Admin panel secured with API keys
- **Helmet.js** - Security headers enabled
- **Input Validation** - All inputs sanitized

---

## 📞 Contact Me

**Interested in this project? Have questions? Want to hire me?**

I'm always happy to discuss this project, explain the code, or explore opportunities!

| | |
|--|--|
| 📧 **Email** | [hustlerashwin2400@gmail.com](mailto:hustlerashwin2400@gmail.com) |
| 💻 **GitHub** | [@Ashwin-0055](https://github.com/Ashwin-0055) |
| 📅 **Schedule Call** | Email me and let's set up a time! |

**Don't hesitate to reach out - I respond to all messages!**

---

<p align="center">
  <b>Developed by Ashwin Yadav</b><br>
  Full Stack Developer
</p>
