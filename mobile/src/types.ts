/**
 * Shared Type Definitions
 * Common types used across the application
 */

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface SavedLocation extends Location {
  name: string;
  id: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: string[];
  activeRole: 'customer' | 'rider';
  customerProfile?: {
    savedLocations: SavedLocation[];
    rating: number;
    totalRides: number;
  };
  riderProfile?: {
    vehicle: {
      type: string;
      plateNumber: string;
      model: string;
      color: string;
    };
    rating: number;
    totalRides: number;
    status: 'offline' | 'online' | 'on_ride';
  };
}

export interface Ride {
  id: string;
  customerId: string;
  riderId?: string;
  pickup: Location;
  dropoff: Location;
  status: 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  fare?: number;
  distance?: number;
  duration?: number;
  vehicleType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: {
    type: string;
    plateNumber: string;
    model: string;
    color: string;
  };
  location: Location;
  rating: number;
}
