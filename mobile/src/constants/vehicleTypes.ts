/**
 * Vehicle Types Configuration
 * Must match backend fare configuration
 */

export type VehicleType = 'bike' | 'auto' | 'cab';

export interface VehicleConfig {
  type: VehicleType;
  displayName: string;
  icon: string;  // Emoji for now, replace with actual icons later
  description: string;
  capacity: number;
  baseRate: number;  // Per km
  estimatedMultiplier: number;  // For ETA calculation
}

export const VEHICLE_TYPES: Record<VehicleType, VehicleConfig> = {
  bike: {
    type: 'bike',
    displayName: 'Bike',
    icon: '🏍️',
    description: 'Affordable rides for one',
    capacity: 1,
    baseRate: 10,
    estimatedMultiplier: 1.0,
  },
  auto: {
    type: 'auto',
    displayName: 'Auto',
    icon: '🛺',
    description: 'Quick and economical',
    capacity: 3,
    baseRate: 15,
    estimatedMultiplier: 1.2,
  },
  cab: {
    type: 'cab',
    displayName: 'Cab',
    icon: '🚗',
    description: 'Comfortable rides',
    capacity: 4,
    baseRate: 20,
    estimatedMultiplier: 1.5,
  },
};

export const getVehicleConfig = (type: VehicleType): VehicleConfig => {
  return VEHICLE_TYPES[type];
};

export const getAllVehicleTypes = (): VehicleConfig[] => {
  return Object.values(VEHICLE_TYPES);
};
