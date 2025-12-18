import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { socketService } from '../services/socketService';
import { useUserStore } from '../store/userStore';
import { authStorage } from '../store/storage';
import { API_URL } from '../config/environment';

interface WSContextType {
  isConnected: boolean;
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
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const updateTokens = useUserStore((state) => state.updateTokens);
  const logout = useUserStore((state) => state.logout);

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken,
      });

      if (response.data.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        await updateTokens(accessToken, newRefreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const connect = async () => {
    try {
      await socketService.connect();
      setIsConnected(true);
    } catch (error: any) {
      if (error.message?.includes('jwt expired') || error.message?.includes('Authentication failed')) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          try {
            await socketService.connect();
            setIsConnected(true);
            return;
          } catch {
            // Reconnection failed
          }
        }

        await logout();
      }

      setIsConnected(false);
    }
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
