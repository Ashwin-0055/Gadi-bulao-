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

import LiveRideMap from '../../src/components/common/LiveRideMap';
import RatingModal from '../../src/components/common/RatingModal';
import OTPDisplay from '../../src/components/common/OTPDisplay';
import { useUserStore, ActiveCustomerRide } from '../../src/store/userStore';
import { useSocket } from '../../src/context/WSProvider';
import { Location } from '../../src/types';
import { getRoute } from '../../src/services/mapService';

interface RideData {
  _id: string;
  status: 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED';
  pickup: Location;
  dropoff: Location;
  rider: {
    name: string;
    phone: string;
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColor?: string;
    rating: number;
  };
  estimatedFare: number;
  vehicleType: string;
  otp?: {
    startOtp: string;
    endOtp: string;
  };
}

export default function CustomerLiveRide() {
  const router = useRouter();
  const { socket: socketService } = useSocket();
  const { activeRide, updateActiveRideStatus, clearActiveRide } = useUserStore();

  // Convert activeRide to RideData format for initial state
  const initialRideData: RideData | null = activeRide ? {
    _id: activeRide.rideId,
    status: activeRide.status,
    pickup: activeRide.pickup,
    dropoff: activeRide.dropoff,
    rider: activeRide.rider,
    estimatedFare: activeRide.estimatedFare,
    vehicleType: activeRide.vehicleType,
    otp: activeRide.otp,
  } : null;

  const [rideData, setRideData] = useState<RideData | null>(initialRideData);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completedFare, setCompletedFare] = useState(0);

  useEffect(() => {
    if (!socketService) {
      Alert.alert('Error', 'Socket connection not available');
      router.back();
      return;
    }

    // Listen for ride status updates
    socketService.onRideStatusUpdate((data: any) => {

      // Update local state - handle both full data and status-only updates
      if (data.status) {
        setRideData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status,
            // If full data is provided, update all fields
            ...(data.pickup && { pickup: data.pickup }),
            ...(data.dropoff && { dropoff: data.dropoff }),
            ...(data.rider && { rider: data.rider }),
            ...(data.estimatedFare && { estimatedFare: data.estimatedFare }),
          };
        });

        // Also update the store
        updateActiveRideStatus(data.status);
      }

      if (data.status === 'COMPLETED') {
        // Show rating modal instead of simple alert
        setCompletedFare(data.fare?.totalAmount || rideData?.estimatedFare || 0);
        setShowRatingModal(true);
      }
    });

    // Listen for driver location updates
    socketService.onDriverLocationUpdate((data: any) => {
      // Handle both { location: {...} } and direct location object
      const location = data.location || data;
      if (location && location.latitude && location.longitude) {
        setDriverLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || '',
        });
      }
    });

    // Listen for ride cancellation
    socketService.onRideCancelled((data) => {
      Alert.alert(
        'Ride Cancelled',
        data.reason || 'Your ride has been cancelled',
        [
          {
            text: 'OK',
            onPress: () => {
              clearActiveRide();
              router.replace('/customer/home');
            },
          },
        ]
      );
    });

    return () => {
      // Cleanup handled by socket service
    };
  }, [socketService]);

  // Fetch route when ride status changes
  useEffect(() => {
    if (rideData?.status === 'STARTED' && rideData.pickup && rideData.dropoff) {
      fetchRouteOSRM(rideData.pickup, rideData.dropoff);
    }
  }, [rideData?.status]);

  // Fetch route to driver when driver location changes (before ride starts)
  useEffect(() => {
    if (driverLocation && rideData && (rideData.status === 'ACCEPTED' || rideData.status === 'ARRIVED')) {
      fetchRouteToDriver(driverLocation, rideData.pickup);
    }
  }, [driverLocation, rideData?.status]);

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
        setEta(result.duration);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const fetchRouteToDriver = async (driverLoc: Location, pickup: Location) => {
    try {
      const result = await getRoute(
        driverLoc.latitude,
        driverLoc.longitude,
        pickup.latitude,
        pickup.longitude
      );

      if (result) {
        setRoute(result.coordinates);
        setEta(result.duration);
      }
    } catch (error) {
      console.error('Error fetching route to driver:', error);
    }
  };

  const formatEta = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusMessage = (): string => {
    switch (rideData?.status) {
      case 'ACCEPTED':
        return 'Driver is on the way to pickup';
      case 'ARRIVED':
        return 'Driver has arrived at pickup';
      case 'STARTED':
        return 'Ride in progress';
      default:
        return 'Searching for driver...';
    }
  };

  const getStatusColor = (): string => {
    switch (rideData?.status) {
      case 'ACCEPTED':
        return '#FF9800';
      case 'ARRIVED':
        return '#00D9FF';
      case 'STARTED':
        return '#00D9FF';
      default:
        return '#666';
    }
  };

  const handleCancelRide = () => {
    if (rideData?.status === 'STARTED') {
      Alert.alert('Cannot Cancel', 'Cannot cancel ride once it has started');
      return;
    }

    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            try {
              if (socketService && rideData?._id) {
                socketService.cancelRide({ rideId: rideData._id, reason: 'Customer cancelled' });
              }
              clearActiveRide();
              router.replace('/customer/home');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel ride');
            }
          },
        },
      ]
    );
  };

  const handleRatingSubmit = (rating: number, comment: string) => {
    if (socketService && rideData?._id) {
      socketService.submitRating({
        rideId: rideData._id,
        rating,
        comment,
        ratedBy: 'customer',
      });
    }
    setShowRatingModal(false);
    clearActiveRide();
    router.replace('/customer/home');
  };

  const handleRatingClose = () => {
    setShowRatingModal(false);
    clearActiveRide();
    router.replace('/customer/home');
  };

  const handleCallDriver = async () => {
    const phoneNumber = rideData?.rider?.phone;
    if (!phoneNumber) {
      Alert.alert('Unable to Call', 'Driver phone number is not available');
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
        Alert.alert('Call Driver', `Phone: ${phoneNumber}`);
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Call Driver', `Phone: ${phoneNumber}`);
    }
  };

  if (!rideData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Map */}
      <LiveRideMap
        pickupLocation={rideData.pickup}
        dropoffLocation={rideData.dropoff}
        driverLocation={driverLocation}
        route={route}
        showDropoff={rideData.status === 'STARTED'}
        style={styles.map}
      />

      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>
        </View>
        {eta && (
          <View style={styles.etaBadge}>
            <Ionicons name="time-outline" size={16} color="#fff" />
            <Text style={styles.etaText}>{formatEta(eta)}</Text>
          </View>
        )}
      </View>

      {/* Driver Info Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverHeader}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitial}>
              {rideData.rider.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{rideData.rider.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{rideData.rider.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Button style={styles.callButton} onPress={handleCallDriver}>
            <Ionicons name="call" size={20} color="#00D9FF" />
          </Button>
        </View>

        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleItem}>
            <Ionicons name="car-outline" size={18} color="#888" />
            <Text style={styles.vehicleText}>
              {rideData.rider.vehicleColor ? `${rideData.rider.vehicleColor} ` : ''}
              {rideData.rider.vehicleModel}
            </Text>
          </View>
          <View style={styles.vehicleItem}>
            <Ionicons name="card-outline" size={18} color="#888" />
            <Text style={styles.vehicleText}>{rideData.rider.vehicleNumber}</Text>
          </View>
        </View>

        {/* OTP Display */}
        {rideData.otp && (
          <View style={styles.otpSection}>
            {(rideData.status === 'ACCEPTED' || rideData.status === 'ARRIVED') && (
              <OTPDisplay
                otp={rideData.otp.startOtp}
                label="Start Ride OTP"
                isActive={true}
              />
            )}
            {rideData.status === 'STARTED' && (
              <OTPDisplay
                otp={rideData.otp.endOtp}
                label="Complete Ride OTP"
                isActive={true}
              />
            )}
          </View>
        )}

        {/* Locations */}
        <View style={styles.locationsContainer}>
          <View style={styles.locationRow}>
            <Ionicons name="radio-button-on" size={16} color="#00D9FF" />
            <Text style={styles.locationText} numberOfLines={1}>
              {rideData.pickup?.address || 'Pickup location'}
            </Text>
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#FF4757" />
            <Text style={styles.locationText} numberOfLines={1}>
              {rideData.dropoff?.address || 'Dropoff location'}
            </Text>
          </View>
        </View>

        {/* Fare */}
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareAmount}>₹{rideData.estimatedFare}</Text>
        </View>

        {/* Cancel Button */}
        {rideData.status !== 'STARTED' && (
          <Button style={styles.cancelButton} onPress={handleCancelRide}>
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </Button>
        )}
      </View>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={handleRatingClose}
        onSubmit={handleRatingSubmit}
        driverName={rideData.rider.name}
        fare={completedFare || rideData.estimatedFare}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  map: {
    flex: 1,
  },
  statusHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
  },
  statusText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  etaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  driverCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitial: {
    color: '#000',
    fontSize: 20,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#888',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    cursor: 'pointer' as any,
  },
  vehicleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  otpSection: {
    marginBottom: 16,
  },
  locationsContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  locationDivider: {
    width: 2,
    height: 20,
    backgroundColor: '#333',
    marginLeft: 7,
    marginVertical: 4,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 15,
    color: '#888',
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00D9FF',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4757',
    cursor: 'pointer' as any,
  },
  cancelButtonText: {
    color: '#FF4757',
    fontSize: 16,
    fontWeight: '600',
  },
});
