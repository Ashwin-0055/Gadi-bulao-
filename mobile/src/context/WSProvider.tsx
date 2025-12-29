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
  const maxRetries = 5; // Increased retries
  const isRefreshingRef = useRef(false);

  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const updateTokens = useUserStore((state) => state.updateTokens);
  const logout = useUserStore((state) => state.logout);

  const refreshAccessToken = async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      return false;
    }
    isRefreshingRef.current = true;

    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) {
        isRefreshingRef.current = false;
        return false;
      }

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
        isRefreshingRef.current = false;
        return true;
      }
      isRefreshingRef.current = false;
      return false;
    } catch (error) {
      isRefreshingRef.current = false;
      return false;
    }
  };

  const connect = async () => {
    if (isConnecting) {
      return;
    }

    setIsConnecting(true);

    try {
      await socketService.connect();
      setIsConnected(true);
      retryCountRef.current = 0;
    } catch (error: any) {
      console.log('Socket connection error:', error.message);

      // Handle JWT expired - try to refresh token silently
      if (error.message?.includes('jwt expired') || error.message?.includes('Authentication failed')) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          try {
            await socketService.connect();
            setIsConnected(true);
            retryCountRef.current = 0;
            setIsConnecting(false);
            return;
          } catch (retryError) {
            console.log('Retry failed after token refresh');
          }
        }

        // DON'T logout immediately - just mark as disconnected
        // User can still use the app, we'll retry on next interaction
        console.log('Token refresh failed, but keeping user logged in');
        setIsConnected(false);
        setIsConnecting(false);

        // Retry connection after delay instead of logging out
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => {
            connect();
          }, 10000); // Retry after 10 seconds
        }
        return;
      }

      // Handle timeout errors - server might be waking up (Render free tier)
      if ((error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setIsConnecting(false);

        // Wait and retry with exponential backoff
        const delay = Math.min(5000 * Math.pow(2, retryCountRef.current - 1), 30000);
        setTimeout(() => {
          connect();
        }, delay);
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
