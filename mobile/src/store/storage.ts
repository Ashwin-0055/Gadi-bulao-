/**
 * AsyncStorage Configuration
 * Expo-compatible key-value storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys
 */
export const StorageKeys = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  ACTIVE_ROLE: 'activeRole',
  SAVED_LOCATIONS: 'savedLocations',
  LAST_LOCATION: 'lastLocation',
  IS_FIRST_LAUNCH: 'isFirstLaunch',
} as const;

/**
 * Storage helpers
 */
export const storageHelpers = {
  // Get string
  getString: async (key: string): Promise<string | undefined> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ?? undefined;
    } catch (error) {
      console.error('Error getting string:', error);
      return undefined;
    }
  },

  // Set string
  setString: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting string:', error);
    }
  },

  // Get object
  getObject: async <T>(key: string): Promise<T | undefined> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error('Error getting object:', error);
      return undefined;
    }
  },

  // Set object
  setObject: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting object:', error);
    }
  },

  // Get boolean
  getBoolean: async (key: string): Promise<boolean | undefined> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return undefined;
      return value === 'true';
    } catch (error) {
      console.error('Error getting boolean:', error);
      return undefined;
    }
  },

  // Set boolean
  setBoolean: async (key: string, value: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error setting boolean:', error);
    }
  },

  // Get number
  getNumber: async (key: string): Promise<number | undefined> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    } catch (error) {
      console.error('Error getting number:', error);
      return undefined;
    }
  },

  // Set number
  setNumber: async (key: string, value: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error setting number:', error);
    }
  },

  // Delete key
  delete: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  },

  // Clear all
  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Check if key exists
  contains: async (key: string): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      console.error('Error checking key:', error);
      return false;
    }
  },
};

/**
 * Auth token helpers
 */
export const authStorage = {
  saveTokens: async (accessToken: string, refreshToken: string) => {
    await storageHelpers.setString(StorageKeys.ACCESS_TOKEN, accessToken);
    await storageHelpers.setString(StorageKeys.REFRESH_TOKEN, refreshToken);
  },

  getAccessToken: async (): Promise<string | undefined> => {
    return await storageHelpers.getString(StorageKeys.ACCESS_TOKEN);
  },

  getRefreshToken: async (): Promise<string | undefined> => {
    return await storageHelpers.getString(StorageKeys.REFRESH_TOKEN);
  },

  clearTokens: async () => {
    await storageHelpers.delete(StorageKeys.ACCESS_TOKEN);
    await storageHelpers.delete(StorageKeys.REFRESH_TOKEN);
  },

  hasTokens: async (): Promise<boolean> => {
    return (
      (await storageHelpers.contains(StorageKeys.ACCESS_TOKEN)) &&
      (await storageHelpers.contains(StorageKeys.REFRESH_TOKEN))
    );
  },
};
