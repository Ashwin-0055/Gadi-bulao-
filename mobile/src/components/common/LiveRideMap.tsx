import { Platform } from 'react-native';
import { Location } from '../../types';

export interface LiveRideMapProps {
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  driverLocation: Location | null;
  route: { latitude: number; longitude: number }[];
  showDropoff?: boolean;
  style?: object;
}

// Re-export the appropriate platform-specific component
let LiveRideMap: React.FC<LiveRideMapProps>;

if (Platform.OS === 'web') {
  // Use require for web platform to avoid bundling issues
  LiveRideMap = require('./LiveRideMap.web').default;
} else {
  // Use require for native platforms
  LiveRideMap = require('./LiveRideMap.native').default;
}

export default LiveRideMap;
