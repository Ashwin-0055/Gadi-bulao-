import { Platform } from 'react-native';
import { Location } from '../../types';

export interface RiderMapProps {
  currentLocation: Location | null;
  isOnDuty: boolean;
  style?: object;
}

// Re-export the appropriate platform-specific component
let RiderMap: React.FC<RiderMapProps>;

if (Platform.OS === 'web') {
  // Use require for web platform to avoid bundling issues
  RiderMap = require('./RiderMap.web').default;
} else {
  // Use require for native platforms
  RiderMap = require('./RiderMap.native').default;
}

export default RiderMap;
