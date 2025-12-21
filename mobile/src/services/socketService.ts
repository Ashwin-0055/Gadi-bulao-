/**
 * Socket.io Client Service
 * Handles all real-time communication with server
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_CONFIG } from '../config/environment';
import { authStorage } from '../store/storage';

export type SocketEventCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, SocketEventCallback[]> = new Map();
  private pendingListeners: Array<{ event: string; callback: SocketEventCallback }> = [];

  /**
   * Connect to Socket.io server
   */
  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const accessToken = await authStorage.getAccessToken();

      if (!accessToken) {
        reject(new Error('No access token found'));
        return;
      }

      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Create socket connection
      this.socket = io(SOCKET_URL, {
        ...SOCKET_CONFIG,
        auth: {
          token: accessToken,
        },
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        this.attachPendingListeners();
        resolve();
      });

      this.socket.on('connected', () => {
        // Server acknowledged connection
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });

      this.socket.on('error', () => {
        // Socket error
      });

      this.socket.on('disconnect', () => {
        // Socket disconnected
      });

      // Re-attach event handlers on reconnect
      this.socket.on('reconnect', () => {
        this.reattachEventHandlers();
      });

      // Timeout - wait longer for Render free tier wake-up (50+ seconds)
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Socket connection timeout'));
        }
      }, 65000);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Listen for event from server
   */
  on(event: string, callback: SocketEventCallback): void {
    // Store callback for re-attachment on reconnect
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);

    if (!this.socket) {
      // Queue listener to be attached when socket connects
      this.pendingListeners.push({ event, callback });
      return;
    }

    // Attach to socket
    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: SocketEventCallback): void {
    if (!this.socket) {
      return;
    }

    if (callback) {
      // Remove specific callback
      this.socket.off(event, callback);

      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(callback);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    } else {
      // Remove all callbacks for this event
      this.socket.off(event);
      this.eventHandlers.delete(event);
    }

    // Stopped listening to event
  }

  /**
   * Attach pending listeners that were queued before socket was ready
   */
  private attachPendingListeners(): void {
    if (this.pendingListeners.length === 0) return;

    this.pendingListeners.forEach(({ event, callback }) => {
      this.socket?.on(event, callback);
    });
    this.pendingListeners = [];
  }

  /**
   * Reattach event handlers after reconnect
   */
  private reattachEventHandlers(): void {
    this.eventHandlers.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // ============================================
  // DRIVER (RIDER) EVENTS
  // ============================================

  /**
   * Go on duty as driver
   */
  goOnDuty(data: { latitude: number; longitude: number; vehicleType?: string }): void {
    this.emit('goOnDuty', data);
  }

  /**
   * Go off duty as driver
   */
  goOffDuty(): void {
    this.emit('goOffDuty');
  }

  /**
   * Subscribe to geospatial zone
   */
  subscribeToZone(data: { latitude: number; longitude: number }): void {
    this.emit('subscribeToZone', data);
  }

  /**
   * Accept a ride request
   * Returns a promise that resolves when the ride is accepted or rejects on error
   */
  acceptRide(rideId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      // Set up one-time listeners for response
      const onSuccess = (data: any) => {
        this.socket?.off('rideAcceptedConfirm', onSuccess);
        this.socket?.off('error', onError);
        resolve(data);
      };

      const onError = (error: any) => {
        this.socket?.off('rideAcceptedConfirm', onSuccess);
        this.socket?.off('error', onError);
        reject(new Error(error.message || 'Failed to accept ride'));
      };

      this.socket.once('rideAcceptedConfirm', onSuccess);
      this.socket.once('error', onError);

      // Emit the accept event
      this.emit('rideAccepted', { rideId });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.off('rideAcceptedConfirm', onSuccess);
        this.socket?.off('error', onError);
        reject(new Error('Accept ride timeout'));
      }, 10000);
    });
  }

  /**
   * Mark arrived at pickup
   */
  rideArrived(data: { rideId: string }): void {
    this.emit('rideArrived', data);
  }

  /**
   * Start the ride with OTP verification
   */
  rideStarted(data: { rideId: string; otp?: string }): void {
    this.emit('rideStarted', data);
  }

  /**
   * Complete the ride with OTP verification
   */
  rideCompleted(data: { rideId: string; otp?: string }): void {
    this.emit('rideCompleted', data);
  }

  /**
   * Update driver location
   */
  updateLocation(data: { rideId?: string; latitude: number; longitude: number }): void {
    this.emit('updateLocation', data);
  }

  // ============================================
  // CUSTOMER EVENTS
  // ============================================

  /**
   * Request a ride
   */
  requestRide(data: {
    pickup: { latitude: number; longitude: number; address: string };
    dropoff: { latitude: number; longitude: number; address: string };
    vehicleType: string;
  }): void {
    this.emit('requestRide', data);
  }

  /**
   * Cancel a ride
   */
  cancelRide(data: { rideId: string; reason?: string }): void {
    this.emit('cancelRide', data);
  }

  /**
   * Submit rating for a completed ride
   */
  submitRating(data: { rideId: string; rating: number; comment?: string; ratedBy: 'customer' | 'rider' }): void {
    this.emit('submitRating', data);
  }

  // ============================================
  // EVENT LISTENERS (Common)
  // ============================================

  /**
   * Listen for duty status changes
   */
  onDutyStatusChanged(callback: (data: { isOnDuty: boolean }) => void): void {
    this.on('dutyStatusChanged', callback);
  }

  /**
   * Listen for zone subscription confirmation
   */
  onZoneSubscribed(callback: (data: { zone: string; driversInZone: number }) => void): void {
    this.on('zoneSubscribed', callback);
  }

  /**
   * Listen for new ride requests (Driver)
   */
  onNewRideRequest(callback: (data: any) => void): void {
    this.on('newRideRequest', callback);
  }

  /**
   * Listen for ride unavailable (Driver)
   */
  onRideUnavailable(callback: (data: { rideId: string }) => void): void {
    this.on('rideUnavailable', callback);
  }

  /**
   * Listen for ride acceptance confirmation (Driver)
   */
  onRideAcceptedConfirm(callback: (data: { rideId: string; status: string }) => void): void {
    this.on('rideAcceptedConfirm', callback);
  }

  /**
   * Listen for ride accepted (Customer)
   */
  onRideAccepted(callback: (data: any) => void): void {
    this.on('rideAccepted', callback);
  }

  /**
   * Listen for ride requested confirmation (Customer)
   */
  onRideRequested(callback: (data: any) => void): void {
    this.on('rideRequested', callback);
  }

  /**
   * Listen for driver location updates (Customer)
   */
  onDriverLocationUpdate(
    callback: (data: { rideId: string; location: { latitude: number; longitude: number } }) => void
  ): void {
    this.on('driverLocationUpdate', callback);
  }

  /**
   * Listen for ride status updates
   */
  onRideStatusUpdate(callback: (data: { rideId: string; status: string }) => void): void {
    this.on('rideStatusUpdate', callback);
  }

  /**
   * Listen for ride status update confirmation (Driver)
   */
  onRideStatusUpdateConfirm(callback: (data: { rideId: string; status: string }) => void): void {
    this.on('rideStatusUpdateConfirm', callback);
  }

  /**
   * Listen for ride cancellation
   */
  onRideCancelled(
    callback: (data: { rideId: string; cancelledBy: string; reason: string }) => void
  ): void {
    this.on('rideCancelled', callback);
  }

  /**
   * Listen for ride cancellation confirmation
   */
  onRideCancelledConfirm(callback: (data: { rideId: string }) => void): void {
    this.on('rideCancelledConfirm', callback);
  }
}

// Singleton instance
export const socketService = new SocketService();

export default socketService;
