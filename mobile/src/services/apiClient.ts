import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/environment';
import { useUserStore } from '../store/userStore';
import { authStorage } from '../store/storage';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await authStorage.getAccessToken();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
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

      const refreshToken = await authStorage.getRefreshToken();

      if (!refreshToken) {
        useUserStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data.data.tokens;

        useUserStore.getState().updateTokens(newAccessToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
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

export const api = {
  auth: {
    login: (data: { phone: string; name: string; role?: string; vehicle?: any }) =>
      apiClient.post('/api/auth/login', data),

    refreshToken: (refreshToken: string) =>
      apiClient.post('/api/auth/refresh', { refreshToken }),

    registerRider: (data: {
      vehicleType: string;
      vehicleModel: string;
      plateNumber: string;
      color?: string;
    }) => apiClient.post('/api/auth/register-rider', data),

    getProfile: () => apiClient.get('/api/auth/profile'),
  },

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
  },
};

export default apiClient;
