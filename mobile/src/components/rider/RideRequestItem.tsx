import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Button = Platform.OS === 'web' ? Pressable : TouchableOpacity;

interface RideRequest {
  _id?: string;
  rideId?: string;
  customer?: {
    name: string;
    phone: string;
    rating: number;
  };
  pickup?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicleType?: string;
  estimatedFare?: number;
  fare?: {
    totalAmount: number;
    distanceKm?: number;
  };
  distance?: number;
  timestamp?: Date;
}

interface RideRequestItemProps {
  request: RideRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  timeoutSeconds?: number;
}

const RideRequestItem: React.FC<RideRequestItemProps> = ({
  request,
  onAccept,
  onReject,
  timeoutSeconds = 30,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get the request ID (handle both _id and rideId)
  const requestId = request._id || request.rideId || '';

  // Safe access to customer data with fallbacks
  const customerName = request.customer?.name || 'Customer';
  const customerRating = request.customer?.rating ?? 5.0;
  const pickupAddress = request.pickup?.address || 'Pickup location';
  const dropoffAddress = request.dropoff?.address || 'Dropoff location';
  const estimatedFare = request.estimatedFare || request.fare?.totalAmount || 0;
  const distance = request.distance || 0;

  // Store requestId in ref to avoid stale closures in timer
  const requestIdRef = useRef(requestId);
  requestIdRef.current = requestId;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for urgency
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Only set up timer if we have a valid requestId
    if (!requestId) return;

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (requestIdRef.current) {
            onReject(requestIdRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [requestId, onReject]);

  const formatDistance = (meters: number | undefined): string => {
    if (!meters) return '0m';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getVehicleIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'BIKE':
        return 'bicycle';
      case 'AUTO':
        return 'car-sport';
      case 'CAB':
        return 'car';
      default:
        return 'car';
    }
  };

  const progressPercentage = (timeLeft / timeoutSeconds) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
            { translateY: slideAnim },
          ],
        },
        isUrgent && styles.urgentContainer,
      ]}
    >
      {/* Gradient Header with Timer */}
      <LinearGradient
        colors={isUrgent ? ['#FF4757', '#CC2936'] : ['#00D9FF', '#0099CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <View style={styles.newRideLabel}>
            <Ionicons name="notifications" size={14} color="#fff" />
            <Text style={styles.newRideText}>NEW RIDE REQUEST</Text>
          </View>
          <View style={styles.timerBadge}>
            <Ionicons name="time" size={14} color="#fff" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        </View>

        {/* Timer Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progressPercentage}%` },
            ]}
          />
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Customer Info & Fare */}
        <View style={styles.mainInfo}>
          <View style={styles.customerSection}>
            <View style={styles.vehicleIconContainer}>
              <Ionicons name={getVehicleIcon(request.vehicleType || 'CAB')} size={28} color="#00D9FF" />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{customerName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#f39c12" />
                <Text style={styles.ratingText}>{customerRating.toFixed(1)}</Text>
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={12} color="#667eea" />
                  <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.fareSection}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareAmount}>₹{estimatedFare}</Text>
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.locationDetails}>
          <View style={styles.locationRow}>
            <View style={styles.locationIconContainer}>
              <View style={[styles.locationDot, styles.pickupDot]} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {pickupAddress}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine}>
            <View style={styles.routeLineDashed} />
          </View>

          <View style={styles.locationRow}>
            <View style={styles.locationIconContainer}>
              <View style={[styles.locationDot, styles.dropoffDot]} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>DROP-OFF</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {dropoffAddress}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          style={styles.rejectButton}
          onPress={() => onReject(requestId)}
        >
          <Ionicons name="close-circle" size={22} color="#F44336" />
          <Text style={styles.rejectButtonText}>Decline</Text>
        </Button>

        <Button
          style={styles.acceptButton}
          onPress={() => onAccept(requestId)}
        >
          <LinearGradient
            colors={['#00D9FF', '#0099CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.acceptButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={22} color="#000" />
            <Text style={styles.acceptButtonText}>Accept Ride</Text>
          </LinearGradient>
        </Button>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  urgentContainer: {
    shadowColor: '#FF4757',
    borderWidth: 2,
    borderColor: '#FF4757',
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newRideLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newRideText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  content: {
    padding: 16,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '500',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '600',
  },
  fareSection: {
    alignItems: 'flex-end',
  },
  fareLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  fareAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#00D9FF',
  },
  locationDetails: {
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIconContainer: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
  },
  pickupDot: {
    backgroundColor: '#0a0a0a',
    borderColor: '#00D9FF',
  },
  dropoffDot: {
    backgroundColor: '#0a0a0a',
    borderColor: '#FF4757',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 20,
  },
  routeLine: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLineDashed: {
    width: 2,
    height: '100%',
    backgroundColor: '#333',
    borderStyle: 'dashed' as any,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4757',
    gap: 6,
    cursor: 'pointer' as any,
  },
  rejectButtonText: {
    color: '#FF4757',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer' as any,
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  acceptButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RideRequestItem;
