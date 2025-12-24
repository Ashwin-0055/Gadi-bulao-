import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Use Pressable for web as it has better compatibility
const Button = Platform.OS === 'web' ? Pressable : TouchableOpacity;

interface RiderHeaderProps {
  name: string;
  isOnDuty: boolean;
  onDutyToggle: (value: boolean) => void;
  totalEarnings: number;
  todayRides: number;
  rating: number;
  onMenuPress: () => void;
  onLogout: () => void;
}

const RiderHeader: React.FC<RiderHeaderProps> = ({
  name,
  isOnDuty,
  onDutyToggle,
  totalEarnings,
  todayRides,
  rating,
  onMenuPress,
  onLogout,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isOnDuty) {
      // Pulse animation for online indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnDuty]);

  const StatCard = ({ icon, iconColor, label, value, gradientColors }: {
    icon: any;
    iconColor: string;
    label: string;
    value: string | number;
    gradientColors: [string, string];
  }) => (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isOnDuty ? ['#0a0a0a', '#111111'] : ['#0a0a0a', '#0d0d0d']}
        style={styles.gradientBackground}
      >
        {/* Top Row */}
        <View style={styles.topRow}>
          <Button
            style={styles.menuButton}
            onPress={() => {
              console.log('Menu button pressed');
              onMenuPress();
            }}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </Button>

          <View style={[styles.dutyToggle, isOnDuty && styles.dutyToggleActive]}>
            <View style={styles.dutyIndicatorContainer}>
              <Animated.View
                style={[
                  styles.dutyIndicator,
                  isOnDuty && styles.dutyIndicatorActive,
                  isOnDuty && { transform: [{ scale: pulseAnim }] }
                ]}
              />
            </View>
            <Text style={[styles.dutyText, isOnDuty && styles.dutyTextActive]}>
              {isOnDuty ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnDuty}
              onValueChange={onDutyToggle}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#00D9FF' }}
              thumbColor="#fff"
              ios_backgroundColor="rgba(255,255,255,0.2)"
            />
          </View>

          <Button
            style={styles.logoutButton}
            onPress={() => {
              console.log('Logout button pressed');
              onLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={22} color="#FF5252" />
          </Button>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{name}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="wallet"
            iconColor="#4CAF50"
            label="Earnings"
            value={`₹${totalEarnings.toLocaleString()}`}
            gradientColors={['#00b894', '#00cec9']}
          />
          <StatCard
            icon="car-sport"
            iconColor="#2196F3"
            label="Rides"
            value={todayRides}
            gradientColors={['#0984e3', '#74b9ff']}
          />
          <StatCard
            icon="star"
            iconColor="#FFD700"
            label="Rating"
            value={rating.toFixed(1)}
            gradientColors={['#f39c12', '#f1c40f']}
          />
        </View>
      </LinearGradient>

      {/* Status Banner */}
      {isOnDuty && (
        <View style={styles.statusBanner}>
          <Animated.View
            style={[
              styles.pulseIndicator,
              { transform: [{ scale: pulseAnim }] }
            ]}
          />
          <Text style={styles.statusText}>You're online - Ready to accept rides</Text>
          <Ionicons name="checkmark-circle" size={20} color="#00D9FF" />
        </View>
      )}

      {!isOnDuty && (
        <View style={[styles.statusBanner, styles.statusBannerOffline]}>
          <Ionicons name="moon" size={18} color="#666" />
          <Text style={styles.statusTextOffline}>You're offline - Turn on duty to accept rides</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientBackground: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,82,82,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  dutyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dutyToggleActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: '#00D9FF',
  },
  dutyIndicatorContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dutyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666',
  },
  dutyIndicatorActive: {
    backgroundColor: '#00D9FF',
  },
  dutyText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  dutyTextActive: {
    color: '#00D9FF',
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 14,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    marginHorizontal: 20,
    marginTop: -12,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  statusBannerOffline: {
    backgroundColor: '#111',
    borderColor: '#1a1a1a',
  },
  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D9FF',
  },
  statusText: {
    fontSize: 13,
    color: '#00D9FF',
    fontWeight: '600',
    flex: 1,
  },
  statusTextOffline: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
});

export default RiderHeader;
