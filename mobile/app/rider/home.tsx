import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  Text,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';

import RiderHeader from '../../src/components/rider/RiderHeader';
import RideRequestItem from '../../src/components/rider/RideRequestItem';
import RiderMap from '../../src/components/rider/RiderMap';
import { useRiderStore } from '../../src/store/riderStore';
import { useUserStore } from '../../src/store/userStore';
import { useSocket } from '../../src/context/WSProvider';
import { Location } from '../../src/types';

export default function RiderHome() {
  const router = useRouter();
  const { socket: socketService, disconnect: disconnectSocket } = useSocket();
  const {
    isOnDuty,
    currentZone,
    rideRequests,
    earnings,
    totalRides,
    setOnDuty,
    setCurrentZone,
    addRideRequest,
    removeRideRequest,
    clearRideRequests,
    setActiveRide,
  } = useRiderStore();

  const { user, logout } = useUserStore();

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationWatcher, setLocationWatcher] = useState<ExpoLocation.LocationSubscription | null>(null);

  // Get initial location on mount
  useEffect(() => {
    initializeLocation();

    return () => {
      locationWatcher?.remove();
    };
  }, []);

  // Handle duty toggle
  useEffect(() => {
    if (isOnDuty && currentLocation) {
      startLocationTracking();
      goOnDuty();
    } else {
      stopLocationTracking();
      goOffDuty();
    }
  }, [isOnDuty]);

  // Listen for socket events
  useEffect(() => {
    if (!socketService) return;

    // Listen for ride requests
    socketService.onNewRideRequest((request) => {
      addRideRequest(request);
      // Play notification sound here
    });

    // Listen for zone subscription confirmation
    socketService.onZoneSubscribed((data) => {
      console.log('📍 Zone subscribed:', data);
      setCurrentZone(data.zone);
    });

    // Listen for duty status changes
    socketService.onDutyStatusChanged((data) => {
      console.log('🔄 Duty status changed:', data);
      if (!data.isOnDuty) {
        setOnDuty(false);
        setCurrentZone(null);
      }
    });

    return () => {
      // Cleanup handled by socket service
    };
  }, [socketService]);

  const initializeLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for drivers');
        setIsLoadingLocation(false);
        return;
      }

      // Use browser's native geolocation API for web (more reliable)
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const getLocationWithTimeout = (): Promise<{ latitude: number; longitude: number }> => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Location request timed out'));
            }, 10000); // 10 second timeout

            navigator.geolocation.getCurrentPosition(
              (position) => {
                clearTimeout(timeoutId);
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              },
              (error) => {
                clearTimeout(timeoutId);
                reject(error);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000, // Accept cached location up to 1 minute old
              }
            );
          });
        };

        try {
          const coords = await getLocationWithTimeout();
          setCurrentLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: '',
          });
          setIsLoadingLocation(false);
          return;
        } catch (webError) {
          console.warn('Web geolocation failed, trying expo-location:', webError);
          // Fall through to expo-location
        }
      }

      // For mobile or web fallback - use expo-location with timeout
      const locationPromise = ExpoLocation.getCurrentPositionAsync({
        accuracy: Platform.OS === 'web'
          ? ExpoLocation.Accuracy.Balanced
          : ExpoLocation.Accuracy.BestForNavigation,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Location timeout')), 15000);
      });

      const location = await Promise.race([locationPromise, timeoutPromise]);

      const { latitude, longitude } = location.coords;
      setCurrentLocation({
        latitude,
        longitude,
        address: '',
      });
    } catch (error) {
      console.error('Error getting location:', error);
      // Use a default location for testing on web if all else fails
      if (Platform.OS === 'web') {
        console.warn('Using default location for web testing');
        setCurrentLocation({
          latitude: 28.6139, // Delhi coordinates
          longitude: 77.2090,
          address: '',
        });
      } else {
        Alert.alert('Error', 'Failed to get current location');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      // Skip background permission request on web (not supported)
      if (Platform.OS !== 'web') {
        const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Background Location Required',
            'Please enable background location to receive ride requests while app is in background'
          );
        }
      }

      // For web, use browser's watchPosition API
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newLocation = { latitude, longitude, address: '' };
            setCurrentLocation(newLocation);

            // Send location update to server
            if (socketService && isOnDuty) {
              socketService.updateLocation(newLocation);
            }
          },
          (error) => {
            console.error('Web location watch error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          }
        );

        // Store as a subscription-like object for cleanup
        setLocationWatcher({
          remove: () => navigator.geolocation.clearWatch(watchId),
        } as ExpoLocation.LocationSubscription);
        return;
      }

      // Watch location updates with highest accuracy (mobile)
      const watcher = await ExpoLocation.watchPositionAsync(
        {
          accuracy: Platform.OS === 'web'
            ? ExpoLocation.Accuracy.Balanced
            : ExpoLocation.Accuracy.BestForNavigation,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 5, // Or every 5 meters
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const newLocation = { latitude, longitude, address: '' };
          setCurrentLocation(newLocation);

          // Send location update to server
          if (socketService && isOnDuty) {
            socketService.updateLocation(newLocation);
          }
        }
      );

      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    locationWatcher?.remove();
    setLocationWatcher(null);
  };

  const goOnDuty = () => {
    if (!socketService || !currentLocation) {
      Alert.alert('Error', 'Socket connection or location not available');
      setOnDuty(false);
      return;
    }

    if (!socketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection.');
      setOnDuty(false);
      return;
    }

    socketService.goOnDuty({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    });
    // Zone will be set when server responds via dutyStatusChanged event
  };

  const goOffDuty = () => {
    if (!socketService) return;
    socketService.goOffDuty();
    setCurrentZone(null);
    clearRideRequests();
  };

  const handleDutyToggle = (value: boolean) => {
    if (!currentLocation) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    if (value && rideRequests.length > 0) {
      Alert.alert(
        'Pending Requests',
        'You have pending ride requests. Please respond to them before going off duty.',
        [{ text: 'OK' }]
      );
      return;
    }

    setOnDuty(value);
  };

  const handleAcceptRide = async (requestId: string) => {
    if (!socketService) return;

    // Find the request details before accepting
    const request = rideRequests.find(r => (r._id || r.rideId) === requestId);
    if (!request) {
      Alert.alert('Error', 'Ride request not found');
      return;
    }

    try {
      await socketService.acceptRide(requestId);

      // Set the active ride in the store with all necessary data
      setActiveRide({
        rideId: requestId,
        customerId: request.customerId || '',
        customerName: request.customer?.name || 'Customer',
        customerPhone: request.customer?.phone || '',
        pickup: request.pickup,
        dropoff: request.dropoff,
        status: 'ACCEPTED',
        fare: {
          totalAmount: request.estimatedFare || request.fare?.totalAmount || 0,
        },
        acceptedAt: new Date(),
      });

      clearRideRequests(); // Clear all requests

      // Navigate directly to live ride
      router.push('/rider/liveRide');
    } catch (error: any) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', error.message || 'Failed to accept ride. It may have been taken by another driver.');
      removeRideRequest(requestId);
    }
  };

  const handleRejectRide = async (requestId: string) => {
    removeRideRequest(requestId);
    // Optionally notify server about rejection
  };

  const handleMenuPress = () => {
    Alert.alert('Menu', 'Menu options', [
      { text: 'Profile', onPress: () => {} },
      { text: 'Earnings', onPress: () => {} },
      { text: 'History', onPress: () => {} },
      {
        text: 'Logout',
        onPress: () => {
          Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: async () => {
                // Go off duty first if on duty
                if (isOnDuty) {
                  setOnDuty(false);
                }
                disconnectSocket();
                await logout();
                router.replace('/');
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <RiderHeader
        name={user?.name || 'Driver'}
        isOnDuty={isOnDuty}
        onDutyToggle={handleDutyToggle}
        totalEarnings={earnings}
        todayRides={totalRides}
        rating={user?.riderProfile?.rating || 4.5}
        onMenuPress={handleMenuPress}
        onLogout={() => {
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: async () => {
                if (isOnDuty) {
                  setOnDuty(false);
                }
                disconnectSocket();
                await logout();
                router.replace('/');
              },
            },
          ]);
        }}
      />

      {/* Map */}
      <View style={styles.mapContainer}>
        <RiderMap
          currentLocation={currentLocation}
          isOnDuty={isOnDuty}
          style={styles.map}
        />

        {/* Zone Info */}
        {isOnDuty && currentZone && (
          <View style={styles.zoneInfo}>
            <Text style={styles.zoneText}>Zone: {currentZone}</Text>
          </View>
        )}
      </View>

      {/* Ride Requests List */}
      {rideRequests.length > 0 && (
        <View style={styles.requestsContainer}>
          <Text style={styles.requestsTitle}>
            Incoming Requests ({rideRequests.length})
          </Text>
          <FlatList
            data={rideRequests}
            keyExtractor={(item) => item._id || item.rideId || String(Math.random())}
            renderItem={({ item }) => (
              <RideRequestItem
                request={item}
                onAccept={handleAcceptRide}
                onReject={handleRejectRide}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* No Requests Placeholder */}
      {isOnDuty && rideRequests.length === 0 && (
        <View style={styles.noRequestsContainer}>
          <Text style={styles.noRequestsIcon}>🚗</Text>
          <Text style={styles.noRequestsText}>Waiting for ride requests...</Text>
          <Text style={styles.noRequestsSubtext}>
            You'll be notified when a customer requests a ride nearby
          </Text>
        </View>
      )}

      {/* Offline Placeholder */}
      {!isOnDuty && (
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineIcon}>😴</Text>
          <Text style={styles.offlineText}>You're offline</Text>
          <Text style={styles.offlineSubtext}>
            Turn on duty to start receiving ride requests
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  zoneInfo: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  zoneText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  requestsContainer: {
    maxHeight: '50%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  noRequestsContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 40,
  },
  noRequestsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noRequestsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  noRequestsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  offlineContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 40,
  },
  offlineIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
