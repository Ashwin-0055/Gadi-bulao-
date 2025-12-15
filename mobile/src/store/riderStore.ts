/**
 * Rider Store (Driver Data)
 * Manages driver status, earnings, and ride requests
 */

import { create } from 'zustand';

export interface Vehicle {
  type: 'bike' | 'auto' | 'cab';
  model: string;
  plateNumber: string;
  color: string;
}

export interface RideRequest {
  _id?: string;
  rideId?: string;
  customerId?: string;
  customer?: {
    name: string;
    phone: string;
    rating: number;
  };
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicleType: string;
  fare?: {
    totalAmount: number;
    distanceKm: number;
  };
  estimatedFare?: number;
  distance: number;
  requestedAt?: Date;
  timestamp?: Date;
}

export interface ActiveRide {
  rideId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'ACCEPTED' | 'ARRIVED' | 'STARTED';
  fare: {
    totalAmount: number;
  };
  acceptedAt: Date;
}

interface RiderState {
  // Duty status
  isOnDuty: boolean;
  currentZone: string | null;

  // Vehicle
  vehicle: Vehicle | null;

  // Stats
  totalRides: number;
  earnings: number;
  rating: number;

  // Incoming ride requests
  rideRequests: RideRequest[];

  // Active ride
  activeRide: ActiveRide | null;

  // Actions
  setOnDuty: (isOnDuty: boolean) => void;
  setCurrentZone: (zone: string | null) => void;
  setVehicle: (vehicle: Vehicle) => void;
  addRideRequest: (request: RideRequest) => void;
  removeRideRequest: (rideId: string) => void;
  clearRideRequests: () => void;
  setActiveRide: (ride: ActiveRide | null) => void;
  clearActiveRide: () => void;
  updateActiveRideStatus: (status: 'ACCEPTED' | 'ARRIVED' | 'STARTED') => void;
  completeRide: (earnings: number) => void;
  updateStats: (stats: { totalRides?: number; earnings?: number; rating?: number }) => void;
  reset: () => void;
}

export const useRiderStore = create<RiderState>((set, get) => ({
  // Initial state
  isOnDuty: false,
  currentZone: null,
  vehicle: null,
  totalRides: 0,
  earnings: 0,
  rating: 5.0,
  rideRequests: [],
  activeRide: null,

  // Set on duty
  setOnDuty: (isOnDuty) => {
    set({ isOnDuty });
    if (!isOnDuty) {
      // Clear requests when going off duty
      set({ rideRequests: [], currentZone: null });
    }
  },

  // Set current zone
  setCurrentZone: (zone) => {
    set({ currentZone: zone });
  },

  // Set vehicle
  setVehicle: (vehicle) => {
    set({ vehicle });
  },

  // Add ride request
  addRideRequest: (request) => {
    const requests = get().rideRequests;
    const requestId = request._id || request.rideId;

    // Check if request already exists
    if (requests.some((r) => (r._id || r.rideId) === requestId)) {
      return;
    }

    set({ rideRequests: [...requests, request] });
  },

  // Remove ride request
  removeRideRequest: (rideId) => {
    const requests = get().rideRequests.filter((r) => (r._id || r.rideId) !== rideId);
    set({ rideRequests: requests });
  },

  // Clear all ride requests
  clearRideRequests: () => {
    set({ rideRequests: [] });
  },

  // Set active ride
  setActiveRide: (ride) => {
    set({ activeRide: ride });

    // Clear pending requests when accepting a ride
    if (ride) {
      set({ rideRequests: [] });
    }
  },

  // Clear active ride
  clearActiveRide: () => {
    set({ activeRide: null });
  },

  // Update active ride status
  updateActiveRideStatus: (status) => {
    const activeRide = get().activeRide;
    if (activeRide) {
      set({
        activeRide: {
          ...activeRide,
          status,
        },
      });
    }
  },

  // Complete ride
  completeRide: (rideEarnings) => {
    const currentEarnings = get().earnings;
    const currentTotalRides = get().totalRides;

    set({
      activeRide: null,
      earnings: currentEarnings + rideEarnings,
      totalRides: currentTotalRides + 1,
    });
  },

  // Update stats
  updateStats: (stats) => {
    set((state) => ({
      ...state,
      ...stats,
    }));
  },

  // Reset (logout)
  reset: () => {
    set({
      isOnDuty: false,
      currentZone: null,
      rideRequests: [],
      activeRide: null,
    });
  },
}));
