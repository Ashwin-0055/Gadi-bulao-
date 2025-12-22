import { API_URL } from '../config/environment';
import { useUserStore } from '../store/userStore';
import { authStorage } from '../store/storage';

// Fetch-based API client
const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const accessToken = await authStorage.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle 401 - try to refresh token
    if (response.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the original request
        return fetchApi(endpoint, options);
      }
      useUserStore.getState().logout();
    }
    throw { response: { data, status: response.status } };
  }

  return { data };
};

const tryRefreshToken = async (): Promise<boolean> => {
  try {
    const refreshToken = await authStorage.getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const { accessToken, refreshToken: newRefreshToken } = data.data.tokens;
    await useUserStore.getState().updateTokens(accessToken, newRefreshToken);
    return true;
  } catch {
    return false;
  }
};

export const api = {
  auth: {
    // Email OTP Authentication (Secure)
    sendOtp: (email: string) =>
      fetchApi('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    verifyOtp: (data: {
      email: string;
      otp: string;
      name?: string;
      phone?: string;
      role?: string;
      vehicle?: {
        type: string;
        model: string;
        plateNumber: string;
        color?: string;
      };
    }) =>
      fetchApi('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    refreshToken: (refreshToken: string) =>
      fetchApi('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    registerRider: (data: {
      vehicleType: string;
      vehicleModel: string;
      plateNumber: string;
      color?: string;
    }) => fetchApi('/api/auth/register-rider', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    getProfile: () => fetchApi('/api/auth/profile'),

    switchRole: (role: string) =>
      fetchApi('/api/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
  },

  rides: {
    calculateFare: (data: {
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      vehicleType?: string;
    }) => fetchApi('/api/rides/calculate-fare', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    getHistory: (params?: {
      role?: 'customer' | 'rider';
      status?: string;
      limit?: number;
      page?: number;
    }) => {
      const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return fetchApi(`/api/rides/history${queryString}`);
    },

    getRideById: (rideId: string) => fetchApi(`/api/rides/${rideId}`),
  },
};

export default { api };
