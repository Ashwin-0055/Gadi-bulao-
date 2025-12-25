import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  TextInput,
  TouchableOpacity,
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
import { api } from '../../src/services/apiClient';

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
    updateStats,
  } = useRiderStore();

  const { user, logout, updateUser } = useUserStore();

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationWatcher, setLocationWatcher] = useState<ExpoLocation.LocationSubscription | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [pendingDutyAction, setPendingDutyAction] = useState(false);

  // Fetch latest profile from server and update stats
  const refreshProfile = useCallback(async () => {
    try {
      const response = await api.auth.getProfile();
      if (response.data?.success && response.data?.data?.user) {
        const serverUser = response.data.data.user;

        // Update user store with fresh data
        await updateUser({
          riderProfile: serverUser.riderProfile,
          customerProfile: serverUser.customerProfile,
        });

        // Update rider stats
        if (serverUser.riderProfile) {
          updateStats({
            totalRides: serverUser.riderProfile.totalRides || 0,
            earnings: serverUser.riderProfile.earnings || 0,
            rating: serverUser.riderProfile.rating || 5.0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, [updateStats, updateUser]);

  // Load rider stats from server on mount
  useEffect(() => {
    refreshProfile();
  }, []);

  // Also sync from local user profile as fallback
  useEffect(() => {
    if (user?.riderProfile) {
      updateStats({
        totalRides: user.riderProfile.totalRides || 0,
        earnings: user.riderProfile.earnings || 0,
        rating: user.riderProfile.rating || 5.0,
      });
    }
  }, [user?.riderProfile]);

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

    // Listen for ride unavailable (customer cancelled or another driver accepted)
    socketService.onRideUnavailable((data) => {
      removeRideRequest(data.rideId);
    });

    // Listen for zone subscription confirmation
    socketService.onZoneSubscribed((data) => {
      setCurrentZone(data.zone);
    });

    socketService.onDutyStatusChanged((data) => {
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
      let permissionResult;
      try {
        permissionResult = await ExpoLocation.requestForegroundPermissionsAsync();
      } catch (permError) {
        console.error('Permission request failed:', permError);
        // Use approximate location if permission request crashes
        setCurrentLocation({
          latitude: 20.936,
          longitude: 78.995,
          address: '',
        });
        setIsLoadingLocation(false);
        return;
      }

      const { status } = permissionResult;
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
                maximumAge: 30000, // Accept cached location up to 30 seconds old
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

      // For mobile - use expo-location with high accuracy and timeout
      // Try high accuracy first, fallback to balanced if it takes too long
      try {
        const location = await Promise.race([
          ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.High,
            mayShowUserSettingsDialog: true,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('High accuracy timeout')), 8000)
          ),
        ]);

        const { latitude, longitude, accuracy } = location.coords;
        console.log(`Location acquired with accuracy: ${accuracy}m`);
        setCurrentLocation({
          latitude,
          longitude,
          address: '',
        });
      } catch (highAccuracyError) {
        console.warn('High accuracy failed, trying balanced:', highAccuracyError);

        // Fallback to balanced accuracy
        const location = await Promise.race([
          ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location timeout')), 10000)
          ),
        ]);

        const { latitude, longitude } = location.coords;
        setCurrentLocation({
          latitude,
          longitude,
          address: '',
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      // Use approximate location to prevent crash - location will update when tracking starts
      console.warn('Using approximate location as fallback');
      setCurrentLocation({
        latitude: 20.936, // Approximate Butibori coordinates
        longitude: 78.995,
        address: '',
      });

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Location Issue',
          'Could not get your precise location. Please ensure GPS is enabled and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      // Skip background permission request on web (not supported)
      if (Platform.OS !== 'web') {
        try {
          const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Background location permission not granted');
            // Continue anyway - foreground tracking will still work
          }
        } catch (bgError) {
          console.warn('Background permission request failed:', bgError);
          // Continue with foreground tracking
        }
      }

      // For web, use browser's watchPosition API
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            // Only update if accuracy is reasonable (less than 100m)
            if (!accuracy || accuracy < 100) {
              const newLocation = { latitude, longitude, address: '' };
              setCurrentLocation(newLocation);

              // Send location update to server
              if (socketService && isOnDuty) {
                socketService.updateLocation(newLocation);
              }
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

      // Watch location updates with high accuracy (mobile)
      const watcher = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 3, // Or every 3 meters
        },
        (location) => {
          const { latitude, longitude, accuracy } = location.coords;
          // Only update if accuracy is reasonable (less than 50m for mobile)
          if (!accuracy || accuracy < 50) {
            const newLocation = { latitude, longitude, address: '' };
            setCurrentLocation(newLocation);

            // Send location update to server
            if (socketService && isOnDuty) {
              socketService.updateLocation(newLocation);
            }
          } else {
            console.log(`Skipping low accuracy location: ${accuracy}m`);
          }
        }
      );

      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      // Don't crash - continue with current location
      Alert.alert(
        'Location Tracking',
        'Location tracking could not be started. Your location may not update in real-time.',
        [{ text: 'OK' }]
      );
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

    // Include vehicle type so server can filter ride requests appropriately
    const vehicleType = user?.riderProfile?.vehicle?.type;

    socketService.goOnDuty({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      vehicleType: vehicleType,
    });
    // Zone will be set when server responds via dutyStatusChanged event
  };

  const goOffDuty = () => {
    if (!socketService) return;
    socketService.goOffDuty();
    setCurrentZone(null);
    clearRideRequests();
  };

  // Validate phone number format (Indian: 10 digits)
  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const handlePhoneSubmit = () => {
    if (!isValidPhone(phoneNumber)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number');
      return;
    }

    setShowPhoneModal(false);

    // Proceed with going on duty
    if (pendingDutyAction) {
      setOnDuty(true);
      setPendingDutyAction(false);
    }
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

    // Check phone number before going on duty
    if (value && !user?.phone && !phoneNumber) {
      setPendingDutyAction(true);
      setShowPhoneModal(true);
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
    Alert.alert('Menu', 'Select an option', [
      { text: 'Profile', onPress: () => router.push('/profile') },
      { text: 'Ride History', onPress: () => router.push('/history') },
      { text: 'Settings', onPress: () => router.push('/settings') },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Logout', 'Are you sure?', [
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
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

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

      {/* Phone Number Modal */}
      <Modal
        visible={showPhoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Phone Number Required</Text>
            <Text style={styles.modalSubtitle}>
              Your phone number is needed for customers to contact you during rides.
            </Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter 10-digit number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPhoneModal(false);
                  setPendingDutyAction(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handlePhoneSubmit}
              >
                <Text style={styles.modalSubmitText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
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
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  zoneText: {
    color: '#00D9FF',
    fontSize: 13,
    fontWeight: '600',
  },
  requestsContainer: {
    maxHeight: '50%',
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  noRequestsContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  noRequestsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noRequestsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  offlineIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#222',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  phoneInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#00D9FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
