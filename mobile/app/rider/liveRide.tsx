import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Use Pressable for web as it has better compatibility
const Button = Platform.OS === 'web' ? Pressable : TouchableOpacity;
import * as ExpoLocation from 'expo-location';

import LiveRideMap from '../../src/components/common/LiveRideMap';
import OTPInputModal from '../../src/components/common/OTPInputModal';
import { useRiderStore } from '../../src/store/riderStore';
import { useUserStore } from '../../src/store/userStore';
import { useSocket } from '../../src/context/WSProvider';
import { Location } from '../../src/types';
import { getRoute } from '../../src/services/mapService';
import CustomButton from '../../src/components/shared/CustomButton';

interface RideData {
  _id: string;
  status: 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED';
  pickup: Location;
  dropoff: Location;
  customer: {
    name: string;
    phone: string;
    rating: number;
  };
  estimatedFare: number;
  vehicleType: string;
}

export default function RiderLiveRide() {
  const router = useRouter();
  const { socket: socketService } = useSocket();
  const { activeRide, clearActiveRide, updateActiveRideStatus, completeRide, setOnDuty } = useRiderStore();

  // Convert activeRide to RideData format
  const initialRideData: RideData | null = activeRide ? {
    _id: activeRide.rideId,
    status: activeRide.status,
    pickup: activeRide.pickup,
    dropoff: activeRide.dropoff,
    customer: {
      name: activeRide.customerName || 'Customer',
      phone: activeRide.customerPhone || '',
      rating: 5.0,
    },
    estimatedFare: activeRide.fare.totalAmount,
    vehicleType: 'CAB',
  } : null;

  const [rideData, setRideData] = useState<RideData | null>(initialRideData);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<ExpoLocation.LocationSubscription | null>(null);

  // OTP modal states
  const [showStartOTPModal, setShowStartOTPModal] = useState(false);
  const [showEndOTPModal, setShowEndOTPModal] = useState(false);
  const [otpError, setOtpError] = useState<string | undefined>(undefined);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  useEffect(() => {
    initializeLocation();
    startLocationTracking();

    return () => {
      locationWatcher?.remove();
    };
  }, []);

  useEffect(() => {
    if (!socketService) return;

    // Listen for ride updates
    socketService.onRideStatusUpdate((data) => {
      setRideData(data);
    });

    // Listen for ride cancellation
    socketService.onRideCancelled((data) => {
      Alert.alert(
        'Ride Cancelled',
        data.reason || 'Customer cancelled the ride',
        [
          {
            text: 'OK',
            onPress: () => {
              clearActiveRide();
              router.replace('/rider/home');
            },
          },
        ]
      );
    });

    // Listen for OTP verification errors
    socketService.on('otpError', (data: { message: string }) => {
      setOtpError(data.message);
      setIsVerifyingOTP(false);
    });

    // Listen for ride started confirmation (OTP verified)
    socketService.on('rideStartedConfirm', () => {
      setIsVerifyingOTP(false);
      setShowStartOTPModal(false);
      setOtpError(undefined);
      setRideData((prev) => prev ? { ...prev, status: 'STARTED' } : null);
      updateActiveRideStatus('STARTED');
      Alert.alert('Ride Started', 'Navigate to dropoff location');
    });

    // Listen for ride completed confirmation (OTP verified)
    socketService.on('rideCompletedConfirm', () => {
      setIsVerifyingOTP(false);
      setShowEndOTPModal(false);
      setOtpError(undefined);

      // Update earnings and total rides in store
      if (rideData) {
        completeRide(rideData.estimatedFare);
      }

      // Keep driver on-duty after completing ride
      setOnDuty(true);

      Alert.alert(
        'Ride Completed',
        `You earned ₹${rideData?.estimatedFare}! You're still on duty and can receive new ride requests.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/rider/home');
            },
          },
        ]
      );
    });

    return () => {
      // Cleanup handled by socket service
    };
  }, [socketService, rideData]);

  // Fetch route when status or locations change
  useEffect(() => {
    if (rideData && currentLocation) {
      if (rideData.status === 'ACCEPTED' || rideData.status === 'ARRIVED') {
        // Route to pickup
        fetchRouteOSRM(currentLocation, rideData.pickup);
      } else if (rideData.status === 'STARTED') {
        // Route to dropoff
        fetchRouteOSRM(currentLocation, rideData.dropoff);
      }
    }
  }, [rideData?.status, currentLocation]);

  const initializeLocation = async () => {
    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude, address: '' });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      const watcher = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const newLocation = { latitude, longitude, address: '' };
          setCurrentLocation(newLocation);

          // Send location update to customer with rideId for proper routing
          if (socketService && rideData?._id) {
            socketService.updateLocation({
              rideId: rideData._id,
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
            });
          }
        }
      );

      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const fetchRouteOSRM = async (origin: Location, destination: Location) => {
    try {
      const result = await getRoute(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );

      if (result) {
        setRoute(result.coordinates);
        setDistance(result.distance);
        setEta(result.duration);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const formatEta = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const handleArrivedAtPickup = async () => {
    if (!socketService || !rideData) return;

    try {
      socketService.rideArrived({ rideId: rideData._id });
      setRideData({ ...rideData, status: 'ARRIVED' });
      updateActiveRideStatus('ARRIVED');
      Alert.alert('Success', 'Customer has been notified of your arrival');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleStartRide = async () => {
    // Show OTP modal to verify customer
    setOtpError(undefined);
    setShowStartOTPModal(true);
  };

  const handleStartOTPSubmit = (otp: string) => {
    if (!socketService || !rideData) return;

    setIsVerifyingOTP(true);
    setOtpError(undefined);

    // Send ride started with OTP for verification
    socketService.rideStarted({ rideId: rideData._id, otp });
  };

  const handleCompleteRide = async () => {
    // Show OTP modal to verify dropoff
    setOtpError(undefined);
    setShowEndOTPModal(true);
  };

  const handleEndOTPSubmit = (otp: string) => {
    if (!socketService || !rideData) return;

    setIsVerifyingOTP(true);
    setOtpError(undefined);

    // Send ride completed with OTP for verification
    socketService.rideCompleted({ rideId: rideData._id, otp });
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? This may affect your rating.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!socketService || !rideData) return;

            try {
              console.log('🚫 Driver cancelling ride:', rideData._id);

              // Listen for cancellation confirmation
              socketService.onRideCancelledConfirm((data) => {
                console.log('✅ Ride cancelled confirmed:', data);
              });

              socketService.cancelRide({ rideId: rideData._id, reason: 'Driver cancelled' });
              clearActiveRide();
              router.replace('/rider/home');
            } catch (error) {
              console.error('❌ Cancel ride error:', error);
              Alert.alert('Error', 'Failed to cancel ride');
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = async () => {
    const phoneNumber = rideData?.customer?.phone;
    if (!phoneNumber) {
      Alert.alert('Unable to Call', 'Customer phone number is not available');
      return;
    }

    const phoneUrl = Platform.OS === 'android'
      ? `tel:${phoneNumber}`
      : `telprompt:${phoneNumber}`;

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        // For web, show the phone number
        Alert.alert('Call Customer', `Phone: ${phoneNumber}`);
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Call Customer', `Phone: ${phoneNumber}`);
    }
  };

  const getDestination = (): Location => {
    if (!rideData) return { latitude: 0, longitude: 0, address: '' };
    return rideData.status === 'STARTED' ? rideData.dropoff : rideData.pickup;
  };

  const getDestinationLabel = (): string => {
    return rideData?.status === 'STARTED' ? 'Dropoff' : 'Pickup';
  };

  const getStatusColor = (): string => {
    switch (rideData?.status) {
      case 'ACCEPTED':
        return '#FF9800';
      case 'ARRIVED':
        return '#4CAF50';
      case 'STARTED':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  if (!rideData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  const destination = getDestination();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map */}
      <LiveRideMap
        pickupLocation={rideData.status !== 'STARTED' ? rideData.pickup : null}
        dropoffLocation={rideData.dropoff}
        driverLocation={currentLocation}
        route={route}
        showDropoff={rideData.status === 'STARTED'}
        style={styles.map}
      />

      {/* ETA Header */}
      {eta && distance && (
        <View style={styles.etaHeader}>
          <View style={styles.etaContainer}>
            <Text style={styles.etaTime}>{formatEta(eta)}</Text>
            <Text style={styles.etaLabel}>
              {formatDistance(distance)} to {getDestinationLabel()}
            </Text>
          </View>
        </View>
      )}

      {/* Customer Info Card */}
      <View style={styles.bottomSheet}>
        {/* Status Indicator */}
        <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]} />

        {/* Customer Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitial}>
                {rideData.customer.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{rideData.customer.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{rideData.customer.rating.toFixed(1)}</Text>
              </View>
            </View>
            <Button style={styles.callButton} onPress={handleCallCustomer}>
              <Ionicons name="call" size={20} color="#4CAF50" />
            </Button>
          </View>

          {/* Destination */}
          <View style={styles.destinationContainer}>
            <Ionicons
              name={rideData.status === 'STARTED' ? 'location' : 'radio-button-on'}
              size={18}
              color={rideData.status === 'STARTED' ? '#F44336' : '#4CAF50'}
            />
            <Text style={styles.destinationText} numberOfLines={2}>
              {destination.address}
            </Text>
          </View>

          {/* Fare */}
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Fare (Cash)</Text>
            <Text style={styles.fareAmount}>₹{rideData.estimatedFare}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {rideData.status === 'ACCEPTED' && (
            <>
              <CustomButton
                title="I've Arrived"
                onPress={handleArrivedAtPickup}
                variant="primary"
                size="large"
              />
              <CustomButton
                title="Cancel Ride"
                onPress={handleCancelRide}
                variant="outline"
                size="large"
              />
            </>
          )}

          {rideData.status === 'ARRIVED' && (
            <>
              <CustomButton
                title="Start Ride"
                onPress={handleStartRide}
                variant="primary"
                size="large"
              />
              <CustomButton
                title="Cancel Ride"
                onPress={handleCancelRide}
                variant="outline"
                size="large"
              />
            </>
          )}

          {rideData.status === 'STARTED' && (
            <CustomButton
              title="Complete Ride"
              onPress={handleCompleteRide}
              variant="primary"
              size="large"
            />
          )}
        </View>
      </View>

      {/* Start Ride OTP Modal */}
      <OTPInputModal
        visible={showStartOTPModal}
        onClose={() => {
          setShowStartOTPModal(false);
          setOtpError(undefined);
        }}
        onSubmit={handleStartOTPSubmit}
        title="Enter Start OTP"
        subtitle="Ask the customer for the 4-digit start code shown on their app"
        isLoading={isVerifyingOTP}
        error={otpError}
      />

      {/* End Ride OTP Modal */}
      <OTPInputModal
        visible={showEndOTPModal}
        onClose={() => {
          setShowEndOTPModal(false);
          setOtpError(undefined);
        }}
        onSubmit={handleEndOTPSubmit}
        title="Enter Drop-off OTP"
        subtitle="Ask the customer for the 4-digit drop-off code to complete the ride"
        isLoading={isVerifyingOTP}
        error={otpError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  etaHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },
  etaContainer: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  etaTime: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  etaLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  statusBar: {
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  customerSection: {
    padding: 20,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  destinationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  fareLabel: {
    fontSize: 15,
    color: '#666',
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
});
