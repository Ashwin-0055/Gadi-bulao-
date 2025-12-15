/**
 * WebSocket Provider (WSProvider)
 * Manages global Socket.io connection state
 * Connects automatically when user is authenticated
 */

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

  /**
   * Refresh the access token using refresh token
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ No refresh token available');
        return false;
      }

      console.log('🔄 Refreshing access token...');
      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken,
      });

      if (response.data.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        await updateTokens(accessToken, newRefreshToken);
        console.log('✅ Token refreshed successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      return false;
    }
  };

  /**
   * Connect to socket with token refresh retry
   */
  const connect = async () => {
    try {
      await socketService.connect();
      setIsConnected(true);
    } catch (error: any) {
      console.error('Failed to connect to socket:', error);

      // Check if error is due to expired JWT
      if (error.message?.includes('jwt expired') || error.message?.includes('Authentication failed')) {
        console.log('🔄 Token expired, attempting refresh...');
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          // Retry connection with new token
          try {
            await socketService.connect();
            setIsConnected(true);
            console.log('✅ Reconnected with refreshed token');
            return;
          } catch (retryError) {
            console.error('❌ Failed to reconnect after token refresh:', retryError);
          }
        }

        // If refresh failed or reconnect failed, logout
        console.log('🚪 Logging out due to authentication failure');
        await logout();
      }

      setIsConnected(false);
    }
  };

  /**
   * Disconnect from socket
   */
  const disconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
  };

  /**
   * Auto-connect when authenticated
   */
  useEffect(() => {
    if (isAuthenticated && !isConnected) {
      console.log('🔌 Auto-connecting socket (user authenticated)');
      connect();
    } else if (!isAuthenticated && isConnected) {
      console.log('🔌 Auto-disconnecting socket (user logged out)');
      disconnect();
    }
  }, [isAuthenticated]);

  /**
   * Cleanup on unmount
   */
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

/**
 * Hook to use WebSocket context
 */
export const useSocket = (): WSContextType => {
  const context = useContext(WSContext);

  if (!context) {
    throw new Error('useSocket must be used within WSProvider');
  }

  return context;
};

export default WSProvider;
