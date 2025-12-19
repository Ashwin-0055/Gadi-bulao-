import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { socketService } from '../services/socketService';
import { useUserStore } from '../store/userStore';
import { authStorage } from '../store/storage';
import { API_URL } from '../config/environment';

interface WSContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  socket: typeof socketService;
}

const WSContext = createContext<WSContextType | undefined>(undefined);

interface WSProviderProps {
  children: ReactNode;
}

export const WSProvider: React.FC<WSProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const updateTokens = useUserStore((state) => state.updateTokens);
  const logout = useUserStore((state) => state.logout);

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ No refresh token available');
        return false;
      }

      console.log('🔄 Refreshing access token...');
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        const { accessToken, refreshToken: newRefreshToken } = data.data.tokens;
        await updateTokens(accessToken, newRefreshToken);
        console.log('✅ Token refreshed successfully');
        return true;
      }
      console.log('❌ Token refresh failed:', data.message);
      return false;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  };

  const connect = async () => {
    if (isConnecting) {
      console.log('⏳ Already connecting...');
      return;
    }

    setIsConnecting(true);

    try {
      console.log('🔌 Connecting to socket server...');
      await socketService.connect();
      setIsConnected(true);
      retryCountRef.current = 0;
      console.log('✅ Socket connected!');
    } catch (error: any) {
      console.error('❌ Socket connection failed:', error.message);

      // Handle JWT expired - try to refresh token
      if (error.message?.includes('jwt expired') || error.message?.includes('Authentication failed')) {
        console.log('🔑 Token expired, attempting refresh...');
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          try {
            console.log('🔌 Retrying connection with new token...');
            await socketService.connect();
            setIsConnected(true);
            retryCountRef.current = 0;
            setIsConnecting(false);
            return;
          } catch (retryError) {
            console.error('❌ Retry failed after token refresh:', retryError);
          }
        }

        // If refresh failed, logout user
        console.log('🚪 Token refresh failed, logging out...');
        await logout();
        setIsConnected(false);
        setIsConnecting(false);
        return;
      }

      // Handle timeout errors - server might be waking up (Render free tier)
      if (error.message?.includes('timeout') && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`⏰ Timeout - server might be waking up. Retry ${retryCountRef.current}/${maxRetries} in 5 seconds...`);
        setIsConnecting(false);

        // Wait and retry
        setTimeout(() => {
          connect();
        }, 5000);
        return;
      }

      setIsConnected(false);
    }

    setIsConnecting(false);
  };

  const disconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
  };

  useEffect(() => {
    if (isAuthenticated && !isConnected) {
      connect();
    } else if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  const value: WSContextType = {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    socket: socketService,
  };

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export const useSocket = (): WSContextType => {
  const context = useContext(WSContext);

  if (!context) {
    throw new Error('useSocket must be used within WSProvider');
  }

  return context;
};

export default WSProvider;
