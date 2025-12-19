import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../shared/CustomButton';

interface VehicleType {
  type: 'bike' | 'auto' | 'cab';
  name: string;
  description: string;
  icon: string;
  baseRate: number;
}

interface RideBookingSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  distance: number | null;
  duration: number | null;
  onBookRide: (vehicleType: 'bike' | 'auto' | 'cab') => void;
  onCancelSearch?: () => void;
  isSearching: boolean;
  isLoadingRoute?: boolean;
}

const VEHICLE_TYPES: VehicleType[] = [
  {
    type: 'bike',
    name: 'Bike',
    description: 'Affordable rides',
    icon: '🏍️',
    baseRate: 10,
  },
  {
    type: 'auto',
    name: 'Auto',
    description: 'Comfortable 3-seater',
    icon: '🛺',
    baseRate: 15,
  },
  {
    type: 'cab',
    name: 'Cab',
    description: 'Premium 4-seater',
    icon: '🚗',
    baseRate: 20,
  },
];

const RideBookingSheet: React.FC<RideBookingSheetProps> = ({
  bottomSheetRef,
  distance,
  duration,
  onBookRide,
  onCancelSearch,
  isSearching,
  isLoadingRoute,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<'bike' | 'auto' | 'cab'>('auto');
  const snapPoints = useMemo(() => ['40%', '60%'], []);

  const calculateFare = (vehicleType: VehicleType): number => {
    if (!distance) return 0;
    const BASE_FARE = 5;
    const distanceInKm = distance / 1000;
    return Math.round(BASE_FARE + distanceInKm * vehicleType.baseRate);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Loading Route Indicator */}
        {isLoadingRoute && (
          <View style={styles.loadingRoute}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.loadingRouteText}>Calculating prices...</Text>
          </View>
        )}

        {/* Distance & Duration */}
        {!isLoadingRoute && distance && duration && (
          <View style={styles.tripInfo}>
            <View style={styles.tripInfoItem}>
              <Ionicons name="navigate" size={16} color="#666" />
              <Text style={styles.tripInfoText}>{formatDistance(distance)}</Text>
            </View>
            <View style={styles.tripInfoItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.tripInfoText}>{formatDuration(duration)}</Text>
            </View>
          </View>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={16} color="#666" />
          <Text style={styles.infoNoteText}>
            Most drivers accept rides under 100 km for best availability
          </Text>
        </View>

        {/* Vehicle Type Selection */}
        <Text style={styles.sectionTitle}>Choose a ride</Text>
        <View style={styles.vehicleList}>
          {VEHICLE_TYPES.map((vehicle) => {
            const fare = calculateFare(vehicle);
            const isSelected = selectedVehicle === vehicle.type;

            return (
              <TouchableOpacity
                key={vehicle.type}
                style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                onPress={() => setSelectedVehicle(vehicle.type)}
                disabled={isSearching}
              >
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
                  <View style={styles.vehicleDetails}>
                    <Text style={styles.vehicleName}>{vehicle.name}</Text>
                    <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                  </View>
                </View>
                <View style={styles.vehicleFare}>
                  <Text style={styles.fareAmount}>₹{fare}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Book Ride Button */}
        <View style={styles.footer}>
          {isSearching ? (
            <>
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.searchingTitle}>Searching for drivers...</Text>
                <Text style={styles.searchingText}>
                  Looking for nearby {VEHICLE_TYPES.find((v) => v.type === selectedVehicle)?.name.toLowerCase()}s
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancelSearch}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text style={styles.cancelButtonText}>Stop Searching</Text>
              </TouchableOpacity>
            </>
          ) : (
            <CustomButton
              title="Book Ride"
              onPress={() => onBookRide(selectedVehicle)}
              disabled={!distance}
              variant="primary"
              size="large"
            />
          )}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  handleIndicator: {
    backgroundColor: '#ccc',
  },
  loadingRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  loadingRouteText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  tripInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  vehicleList: {
    gap: 12,
    marginBottom: 20,
  },
  vehicleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  vehicleCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIcon: {
    fontSize: 32,
  },
  vehicleDetails: {
    gap: 2,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  vehicleDescription: {
    fontSize: 13,
    color: '#666',
  },
  vehicleFare: {
    alignItems: 'flex-end',
    gap: 4,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  selectedBadge: {
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    gap: 12,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  searchingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

export default RideBookingSheet;
