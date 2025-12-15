import { Platform } from 'react-native';
import { Location } from '../../types';

export interface DraggableMapProps {
  pickupLocation: Location | null;
  dropoffLocation: Location | null;
  onPickupChange: (location: Location) => void;
  route?: { latitude: number; longitude: number }[];
  currentLocation?: Location;
  driverLocation?: Location;
}

// Re-export the appropriate platform-specific component
let DraggableMap: React.FC<DraggableMapProps>;

if (Platform.OS === 'web') {
  // Use require for web platform to avoid bundling issues
  DraggableMap = require('./DraggableMap.web').default;
} else {
  // Use require for native platforms
  DraggableMap = require('./DraggableMap.native').default;
}

export default DraggableMap;
