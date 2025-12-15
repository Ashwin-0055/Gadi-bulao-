/**
 * API Client with Axios
 * Auto-attaches JWT tokens and handles token refresh on 401
 */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/environment';
import { useUserStore } from '../store/userStore';
import { authStorage } from '../store/storage';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Auto-attach access token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = authStorage.getAccessToken();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle 401 and auto-refresh token
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = authStorage.getRefreshToken();

      if (!refreshToken) {
        // No refresh token, logout
        useUserStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data.data.tokens;

        // Update tokens in store and storage
        useUserStore.getState().updateTokens(newAccessToken, newRefreshToken);

        // Update original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API endpoints
 */
export const api = {
  // Auth
  auth: {
    login: (data: { phone: string; name: string; role?: string }) =>
      apiClient.post('/api/auth/login', data),

    refreshToken: (refreshToken: string) =>
      apiClient.post('/api/auth/refresh', { refreshToken }),

    switchRole: (role: 'customer' | 'rider') =>
      apiClient.post('/api/auth/switch-role', { role }),

    registerRider: (data: {
      vehicleType: string;
      vehicleModel: string;
      plateNumber: string;
      color?: string;
    }) => apiClient.post('/api/auth/register-rider', data),

    getProfile: () => apiClient.get('/api/auth/profile'),
  },

  // Rides
  rides: {
    calculateFare: (data: {
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      vehicleType?: string;
    }) => apiClient.post('/api/rides/calculate-fare', data),

    getHistory: (params?: {
      role?: 'customer' | 'rider';
      status?: string;
      limit?: number;
      page?: number;
    }) => apiClient.get('/api/rides/history', { params }),

    getRideById: (rideId: string) => apiClient.get(`/api/rides/${rideId}`),

    cancelRide: (rideId: string, reason?: string) =>
      apiClient.post(`/api/rides/${rideId}/cancel`, { reason }),
  },
};

export default apiClient;
