import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../src/store/userStore';

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
  neonGreen: '#00FF88',
  neonGold: '#FFD700',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUserStore();

  const isRider = user?.activeRole === 'rider';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[DARK.neonBlue, DARK.neonPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            </LinearGradient>
            <View style={[styles.roleBadge, isRider ? styles.roleBadgeDriver : styles.roleBadgeCustomer]}>
              <Text style={styles.roleBadgeText}>
                {isRider ? 'Driver' : 'Customer'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userPhone}>{user?.phone || user?.email || ''}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {isRider ? user?.riderProfile?.totalRides || 0 : user?.customerProfile?.totalRides || 0}
            </Text>
            <Text style={styles.statLabel}>Total Rides</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color={DARK.neonGold} />
              <Text style={styles.statValue}>
                {isRider ? user?.riderProfile?.rating?.toFixed(1) || '5.0' : user?.customerProfile?.rating?.toFixed(1) || '5.0'}
              </Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          {isRider && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: DARK.neonGreen }]}>
                  ₹{user?.riderProfile?.earnings || 0}
                </Text>
                <Text style={styles.statLabel}>Earnings</Text>
              </View>
            </>
          )}
        </View>

        {/* Vehicle Info (for riders) */}
        {isRider && user?.riderProfile?.vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="car" size={20} color={DARK.neonBlue} />
                </View>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>
                  {user.riderProfile.vehicle.type?.charAt(0).toUpperCase() + user.riderProfile.vehicle.type?.slice(1) || '-'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="speedometer" size={20} color={DARK.neonBlue} />
                </View>
                <Text style={styles.infoLabel}>Model</Text>
                <Text style={styles.infoValue}>{user.riderProfile.vehicle.model || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="card" size={20} color={DARK.neonBlue} />
                </View>
                <Text style={styles.infoLabel}>Plate</Text>
                <Text style={styles.infoValue}>{user.riderProfile.vehicle.plateNumber || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="color-palette" size={20} color={DARK.neonBlue} />
                </View>
                <Text style={styles.infoLabel}>Color</Text>
                <Text style={styles.infoValue}>{user.riderProfile.vehicle.color || '-'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="person" size={20} color={DARK.neonBlue} />
              </View>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="mail" size={20} color={DARK.neonBlue} />
              </View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="shield-checkmark" size={20} color={DARK.neonGreen} />
              </View>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>
                {user?.role?.join(', ') || '-'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: DARK.card,
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK.cardBorder,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: DARK.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: DARK.neonBlue,
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeDriver: {
    backgroundColor: DARK.neonPink,
  },
  roleBadgeCustomer: {
    backgroundColor: DARK.neonBlue,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: DARK.text,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: DARK.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: DARK.card,
    paddingVertical: 20,
    marginBottom: 12,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DARK.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK.text,
  },
  statLabel: {
    fontSize: 13,
    color: DARK.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: DARK.cardBorder,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK.textSecondary,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: DARK.card,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: DARK.cardBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DARK.cardBorder,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    color: DARK.textSecondary,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 15,
    color: DARK.text,
    fontWeight: '500',
  },
});
