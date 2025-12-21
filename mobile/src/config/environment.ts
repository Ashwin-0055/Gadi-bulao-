/**
 * Application Configuration
 * Production-ready settings for Gadi Bulao
 */

// Server Configuration
const PRODUCTION_URL = 'https://gadi-bulao-backend.onrender.com';

export const API_URL = PRODUCTION_URL;
export const SOCKET_URL = API_URL;

// App Configuration
export const APP_NAME = 'Gadi Bulao';
export const APP_VERSION = '1.0.0';

// Socket Configuration
export const SOCKET_CONFIG = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 60000,
};

// Location Configuration
export const LOCATION_CONFIG = {
  backgroundInterval: 10000,
  accuracy: 6,
  distanceInterval: 10,
};

// Map Configuration
export const MAP_CONFIG = {
  initialRegion: {
    latitude: 28.7041,
    longitude: 77.1025,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  searchRadius: 5,
};

// Ride Configuration
export const RIDE_CONFIG = {
  statusRefreshInterval: 3000,
  locationUpdateInterval: 5000,
};
