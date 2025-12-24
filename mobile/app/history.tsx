import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../src/store/userStore';
import { api } from '../src/services/apiClient';

const DARK = {
  bg: '#000000',
  bgSecondary: '#0a0a0a',
  card: '#111111',
  cardBorder: '#1a1a1a',
  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  neonBlue: '#00D9FF',
  neonPink: '#FF2D92',
  neonRed: '#FF4757',
  neonGreen: '#00FF88',
  neonOrange: '#FF9800',
};

interface Ride {
  _id: string;
  pickup: { address?: string };
  dropoff: { address?: string };
  status: string;
  fare?: { totalAmount: number };
  vehicleType: string;
  createdAt: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isRider = user?.activeRole === 'rider';

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const response = await api.rides.getHistory({
        role: isRider ? 'rider' : 'customer',
        limit: 50,
      });
      if (response.data?.data?.rides) {
        setRides(response.data.data.rides);
      }
    } catch (error) {
      // Silent fail - empty list will be shown
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return DARK.neonGreen;
      case 'CANCELLED': return DARK.neonRed;
      case 'STARTED': return DARK.neonBlue;
      case 'ACCEPTED': return DARK.neonOrange;
      default: return DARK.textSecondary;
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'bike': return 'bicycle';
      case 'auto': return 'car-sport';
      case 'cab': return 'car';
      default: return 'car';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRideItem = ({ item }: { item: Ride }) => (
    <TouchableOpacity style={styles.rideCard} activeOpacity={0.7}>
      <View style={styles.rideHeader}>
        <View style={styles.vehicleType}>
          <View style={styles.vehicleIconContainer}>
            <Ionicons name={getVehicleIcon(item.vehicleType) as any} size={24} color={DARK.neonBlue} />
          </View>
          <Text style={styles.vehicleText}>
            {item.vehicleType?.charAt(0).toUpperCase() + item.vehicleType?.slice(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { borderColor: DARK.neonBlue }]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.pickup?.address || 'Pickup location'}
          </Text>
        </View>
        <View style={styles.locationLine} />
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { borderColor: DARK.neonRed }]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.dropoff?.address || 'Dropoff location'}
          </Text>
        </View>
      </View>

      <View style={styles.rideFooter}>
        <View style={styles.dateTime}>
          <Ionicons name="calendar-outline" size={14} color={DARK.textSecondary} />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.fareText}>₹{item.fare?.totalAmount || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="car-outline" size={64} color={DARK.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No rides yet</Text>
      <Text style={styles.emptySubtitle}>
        {isRider ? 'Complete rides to see them here' : 'Book a ride to get started'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DARK.neonBlue} />
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[DARK.neonBlue]}
              tintColor={DARK.neonBlue}
              progressBackgroundColor={DARK.card}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DARK.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: DARK.cardBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DARK.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DARK.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  rideCard: {
    backgroundColor: DARK.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: DARK.cardBorder,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationContainer: {
    paddingLeft: 4,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    backgroundColor: DARK.bg,
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: DARK.cardBorder,
    marginLeft: 5,
    marginVertical: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: DARK.text,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DARK.cardBorder,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: DARK.textSecondary,
  },
  timeText: {
    fontSize: 13,
    color: DARK.textMuted,
  },
  fareText: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK.neonBlue,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: DARK.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DARK.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DARK.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
