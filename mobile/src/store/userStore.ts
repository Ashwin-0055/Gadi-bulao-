import { create } from 'zustand';
import { storageHelpers, StorageKeys, authStorage } from './storage';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
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
    rating: number;
    totalRides: number;
  };
}

export interface ActiveCustomerRide {
  rideId: string;
  status: 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED';
  pickup: Location;
  dropoff: Location;
  rider: {
    name: string;
    phone: string;
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColor?: string;
    rating: number;
  };
  estimatedFare: number;
  vehicleType: string;
  otp?: {
    startOtp: string;
    endOtp: string;
  };
}

interface UserState {
  // Auth
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // User data
  user: UserProfile | null;

  // Location
  currentLocation: Location | null;
  pickupLocation: Location | null;
  dropoffLocation: Location | null;

  // Active ride (for customers)
  activeRide: ActiveCustomerRide | null;

  // Actions
  login: (tokens: { accessToken: string; refreshToken: string }, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => Promise<void>;
  setCurrentLocation: (location: Location) => Promise<void>;
  setPickupLocation: (location: Location | null) => void;
  setDropoffLocation: (location: Location | null) => void;
  addSavedLocation: (location: SavedLocation) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  hydrate: () => Promise<void>;  // Load from storage on app start
  setActiveRide: (ride: ActiveCustomerRide | null) => void;
  updateActiveRideStatus: (status: 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED') => void;
  clearActiveRide: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  currentLocation: null,
  pickupLocation: null,
  dropoffLocation: null,
  activeRide: null,

  // Login
  login: async (tokens, user) => {
    await authStorage.saveTokens(tokens.accessToken, tokens.refreshToken);
    await storageHelpers.setObject(StorageKeys.USER_DATA, user);

    set({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    });
  },

  // Logout
  logout: async () => {
    await authStorage.clearTokens();
    await storageHelpers.delete(StorageKeys.USER_DATA);
    await storageHelpers.delete(StorageKeys.ACTIVE_ROLE);

    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      currentLocation: null,
      pickupLocation: null,
      dropoffLocation: null,
    });
  },

  // Update user
  updateUser: async (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      await storageHelpers.setObject(StorageKeys.USER_DATA, updatedUser);
      set({ user: updatedUser });
    }
  },

  // Set current location
  setCurrentLocation: async (location) => {
    await storageHelpers.setObject(StorageKeys.LAST_LOCATION, location);
    set({ currentLocation: location });
  },

  // Set pickup location
  setPickupLocation: (location) => {
    set({ pickupLocation: location });
  },

  // Set dropoff location
  setDropoffLocation: (location) => {
    set({ dropoffLocation: location });
  },

  // Add saved location
  addSavedLocation: async (location) => {
    const currentUser = get().user;
    if (currentUser?.customerProfile) {
      const savedLocations = [
        ...(currentUser.customerProfile.savedLocations || []),
        location,
      ];

      const updatedUser = {
        ...currentUser,
        customerProfile: {
          ...currentUser.customerProfile,
          savedLocations,
        },
      };

      await storageHelpers.setObject(StorageKeys.USER_DATA, updatedUser);
      set({ user: updatedUser });
    }
  },

  // Remove saved location
  removeSavedLocation: async (id) => {
    const currentUser = get().user;
    if (currentUser?.customerProfile) {
      const savedLocations = currentUser.customerProfile.savedLocations.filter(
        (loc) => loc.id !== id
      );

      const updatedUser = {
        ...currentUser,
        customerProfile: {
          ...currentUser.customerProfile,
          savedLocations,
        },
      };

      await storageHelpers.setObject(StorageKeys.USER_DATA, updatedUser);
      set({ user: updatedUser });
    }
  },

  // Update tokens (after refresh)
  updateTokens: async (accessToken, refreshToken) => {
    await authStorage.saveTokens(accessToken, refreshToken);
    set({ accessToken, refreshToken });
  },

  // Hydrate from storage
  hydrate: async () => {
    const accessToken = await authStorage.getAccessToken();
    const refreshToken = await authStorage.getRefreshToken();
    const user = await storageHelpers.getObject<UserProfile>(StorageKeys.USER_DATA);
    const lastLocation = await storageHelpers.getObject<Location>(StorageKeys.LAST_LOCATION);

    if (accessToken && refreshToken && user) {
      set({
        isAuthenticated: true,
        accessToken,
        refreshToken,
        user,
        currentLocation: lastLocation || null,
      });
    }
  },

  // Set active ride (for customers)
  setActiveRide: (ride) => {
    set({ activeRide: ride });
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

  // Clear active ride
  clearActiveRide: () => {
    set({ activeRide: null });
  },
}));
