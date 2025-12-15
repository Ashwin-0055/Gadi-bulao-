import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Use Pressable for web as it has better compatibility
const Button = Platform.OS === 'web' ? Pressable : TouchableOpacity;
import { useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import * as ExpoLocation from 'expo-location';

import DraggableMap from '../../src/components/customer/DraggableMap';
import LocationBar from '../../src/components/customer/LocationBar';
import RideBookingSheet from '../../src/components/customer/RideBookingSheet';
import { useUserStore } from '../../src/store/userStore';
import { useSocket } from '../../src/context/WSProvider';
import { Location } from '../../src/types';
import { reverseGeocode as osmReverseGeocode, getRoute } from '../../src/services/mapService';

export default function CustomerHome() {
  const router = useRouter();
  const { socket: socketService, disconnect: disconnectSocket } = useSocket();
  const { pickupLocation, dropoffLocation, setPickupLocation, setDropoffLocation, user, logout, setActiveRide } =
    useUserStore();

  const bottomSheetRef = useRef<BottomSheet>(null);

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch route when both locations are set
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      fetchRoute();
    } else {
      setRoute(null);
      setDistance(null);
      setDuration(null);
    }
  }, [pickupLocation, dropoffLocation]);

  // Listen for ride events
  useEffect(() => {
    if (!socketService) return;

    // Listen for ride request confirmation
    socketService.onRideRequested((data) => {
      console.log('📡 Ride requested confirmed:', data);
      // Store the ride ID for potential cancellation
      if (data.rideId) {
        setCurrentRideId(data.rideId);
      }
      // Keep showing loading - waiting for driver to accept
    });

    socketService.onRideAccepted((data) => {
      console.log('📡 Ride accepted data:', data);
      setIsSearching(false);
      setCurrentRideId(null);

      // Use data from server if available, fallback to local store
      const ridePickup = data.pickup || pickupLocation;
      const rideDropoff = data.dropoff || dropoffLocation;

      // Store the ride data in the store before navigating
      setActiveRide({
        rideId: data.rideId || data._id,
        status: 'ACCEPTED',
        pickup: ridePickup!,
        dropoff: rideDropoff!,
        rider: {
          name: data.rider?.name || 'Driver',
          phone: data.rider?.phone || '',
          vehicleNumber: data.rider?.vehicleNumber || data.rider?.vehicle?.plateNumber || '',
          vehicleModel: data.rider?.vehicleModel || data.rider?.vehicle?.model || '',
          vehicleColor: data.rider?.vehicleColor || data.rider?.vehicle?.color || '',
          rating: data.rider?.rating || 5.0,
        },
        estimatedFare: data.fare?.totalAmount || data.estimatedFare || 0,
        vehicleType: data.vehicleType || 'cab',
        otp: data.otp ? {
          startOtp: data.otp.startOtp,
          endOtp: data.otp.endOtp,
        } : undefined,
      });

      Alert.alert(
        'Ride Accepted!',
        `Driver ${data.rider?.name || 'Driver'} is on the way!`,
        [
          {
            text: 'View Ride',
            onPress: () => router.push('/customer/liveRide'),
          },
        ]
      );
    });

    socketService.onRideCancelled(() => {
      Alert.alert(
        'No Drivers Available',
        'Sorry, no drivers are available nearby. Please try again.',
        [{ text: 'OK', onPress: () => setIsSearching(false) }]
      );
    });

    // Listen for errors
    socketService.on('error', (error) => {
      console.error('Socket error:', error);
      setIsSearching(false);
      Alert.alert('Error', error.message || 'Something went wrong');
    });

    return () => {
      // Cleanup listeners handled by socket service
    };
  }, [socketService]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        setIsLoadingLocation(false);
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const address = await reverseGeocode(latitude, longitude);

      const locationData: Location = {
        latitude,
        longitude,
        address,
      };

      setCurrentLocation(locationData);
      if (!pickupLocation) {
        setPickupLocation(locationData);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    return await osmReverseGeocode(lat, lng);
  };

  const fetchRoute = async () => {
    if (!pickupLocation || !dropoffLocation) return;

    try {
      const routeResult = await getRoute(
        pickupLocation.latitude,
        pickupLocation.longitude,
        dropoffLocation.latitude,
        dropoffLocation.longitude
      );

      if (routeResult) {
        setRoute(routeResult.coordinates);
        setDistance(routeResult.distance); // in meters
        setDuration(routeResult.duration); // in seconds
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to fetch route');
    }
  };

  const handlePickupChange = async (location: Location) => {
    // Reverse geocode the new location
    const address = await reverseGeocode(location.latitude, location.longitude);
    setPickupLocation({ ...location, address });
  };

  const handleBookRide = async (vehicleType: 'bike' | 'auto' | 'cab') => {
    if (!pickupLocation || !dropoffLocation || !distance || !socketService) {
      Alert.alert('Error', 'Please select both pickup and dropoff locations');
      return;
    }

    setIsSearching(true);

    try {
      socketService.requestRide({
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        vehicleType,
      });
    } catch (error) {
      console.error('Error requesting ride:', error);
      Alert.alert('Error', 'Failed to request ride. Please try again.');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = () => {
    Alert.alert(
      'Cancel Search',
      'Are you sure you want to stop searching for drivers?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            if (socketService && currentRideId) {
              socketService.cancelRide({ rideId: currentRideId, reason: 'Customer cancelled search' });
            }
            setIsSearching(false);
            setCurrentRideId(null);
          },
        },
      ]
    );
  };

  const handleMenuPress = () => {
    console.log('Menu button pressed');
    Alert.alert('Menu', 'Menu options', [
      { text: 'Profile', onPress: () => {} },
      { text: 'Ride History', onPress: () => {} },
      { text: 'Settings', onPress: () => {} },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => handleLogout(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLogout = () => {
    console.log('Logout button pressed');
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          disconnectSocket();
          await logout();
          router.replace('/');
        },
      },
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

      {/* Map */}
      <DraggableMap
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        onPickupChange={handlePickupChange}
        route={route || undefined}
        currentLocation={currentLocation || undefined}
      />

      {/* Top Bar - Location Inputs */}
      <View style={styles.topBar}>
        <View style={styles.locationInputs}>
          <LocationBar
            label="Pickup"
            placeholder="Enter pickup location"
            value={pickupLocation?.address || ''}
            onLocationSelect={setPickupLocation}
            icon="radio-button-on"
            zIndexOffset={100}
          />
          <View style={styles.locationSeparator}>
            <View style={styles.dotLine} />
          </View>
          <LocationBar
            label="Dropoff"
            placeholder="Where to?"
            value={dropoffLocation?.address || ''}
            onLocationSelect={setDropoffLocation}
            icon="location"
            zIndexOffset={0}
          />
        </View>
      </View>

      {/* Header Actions */}
      <View style={styles.header}>
        <Button style={styles.iconButton} onPress={handleMenuPress}>
          <Ionicons name="menu" size={24} color="#000" />
        </Button>
        <Button style={styles.iconButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#000" />
        </Button>
      </View>

      {/* My Location Button */}
      <Button style={styles.myLocationButton} onPress={getCurrentLocation}>
        <Ionicons name="locate" size={24} color="#000" />
      </Button>

      {/* Booking Bottom Sheet */}
      <RideBookingSheet
        bottomSheetRef={bottomSheetRef}
        distance={distance}
        duration={duration}
        onBookRide={handleBookRide}
        onCancelSearch={handleCancelSearch}
        isSearching={isSearching}
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    cursor: 'pointer' as any,
  },
  topBar: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  locationInputs: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  locationSeparator: {
    paddingVertical: 8,
    paddingLeft: 20,
  },
  dotLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    borderRadius: 1,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 420,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    cursor: 'pointer' as any,
  },
});
