import { Platform } from 'react-native';

/**
 * Environment Configuration
 * Update these values for your deployment
 */

// Server Configuration
// For web: use localhost (same machine)
// For mobile: use computer's LAN IP address
const LOCAL_IP = '10.135.104.135';

export const API_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:3000'  // Web: use localhost
    : `http://${LOCAL_IP}:3000`  // Mobile: use LAN IP for Expo Go
  : 'https://your-production-server.com';  // Production: your deployed backend

export const SOCKET_URL = API_URL;

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = 'AIzaSyDvnJHejt7MNC28PJ8ytkPVxiv4opxdnpY';

// App Configuration
export const APP_NAME = 'Gadi Bulao';
export const APP_VERSION = '1.0.0';

// Socket Configuration
export const SOCKET_CONFIG = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
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
