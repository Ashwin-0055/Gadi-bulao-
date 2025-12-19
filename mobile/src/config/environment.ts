import { Platform } from 'react-native';

// Server Configuration
const PRODUCTION_URL = 'https://gadi-bulao-backend.onrender.com';
const LOCAL_IP = '192.168.1.100'; // Update this if testing locally

// Always use production URL for consistent behavior
export const API_URL = PRODUCTION_URL;

export const SOCKET_URL = API_URL;

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = 'AIzaSyDvnJHejt7MNC28PJ8ytkPVxiv4opxdnpY';

// App Configuration
export const APP_NAME = 'Gadi Bulao';
export const APP_VERSION = '1.0.0';

// Socket Configuration
// Note: Render free tier can take 50+ seconds to wake up from sleep
export const SOCKET_CONFIG = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 60000, // 60 seconds timeout for Render wake-up
};

// Location Configuration
export const LOCATION_CONFIG = {
  // Background location tracking interval (milliseconds)
  backgroundInterval: 10000, // 10 seconds

  // Accuracy
  accuracy: 6, // High accuracy

  // Minimum distance between updates (meters)
  distanceInterval: 10,
};

// Map Configuration
export const MAP_CONFIG = {
  initialRegion: {
    latitude: 28.7041,  // Delhi, India
    longitude: 77.1025,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },

  // Search radius for nearby drivers (km)
  searchRadius: 5,
};

// Ride Configuration
export const RIDE_CONFIG = {
  // Auto-refresh interval for ride status (milliseconds)
  statusRefreshInterval: 3000,

  // Driver location update interval (milliseconds)
  locationUpdateInterval: 5000,
};

// Development Flags
export const DEBUG = {
  enableLogs: __DEV__,
  showFakeDrivers: __DEV__, // Show simulated drivers on map
  mockLocation: false, // Use mock location data
};
