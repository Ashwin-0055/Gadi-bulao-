/**
 * Clerk Authentication Configuration
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';

// Clerk Publishable Key
export const CLERK_PUBLISHABLE_KEY = 'pk_test_bmVhcmJ5LXZ1bHR1cmUtMTQuY2xlcmsuYWNjb3VudHMuZGV2JA';

// Token cache for Clerk (stores tokens securely)
const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        if (Platform.OS === 'web') {
          return localStorage.getItem(key);
        }
        const item = await SecureStore.getItemAsync(key);
        return item;
      } catch (error) {
        console.error('Error getting token:', error);
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem(key, token);
          return;
        }
        await SecureStore.setItemAsync(key, token);
      } catch (error) {
        console.error('Error saving token:', error);
      }
    },
    clearToken: async (key: string) => {
      try {
        if (Platform.OS === 'web') {
          localStorage.removeItem(key);
          return;
        }
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('Error clearing token:', error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
