import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../src/store/userStore';
import { Colors } from '../src/constants/colors';
import { useEffect, useState } from 'react';
import AnimatedSplash from '../src/components/AnimatedSplash';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);
  const [showSplash, setShowSplash] = useState(true);

  // Auto-navigate if already authenticated (after splash)
  useEffect(() => {
    if (!showSplash && isAuthenticated && user) {
      if (user.activeRole === 'customer') {
        router.replace('/customer/home');
      } else if (user.activeRole === 'rider') {
        router.replace('/rider/home');
      }
    }
  }, [isAuthenticated, user, showSplash]);

  // Show animated splash screen first
  if (showSplash) {
    return <AnimatedSplash onAnimationComplete={() => setShowSplash(false)} />;
  }

  const handleRoleSelect = (role: 'customer' | 'rider') => {
    // Navigate to login with selected role
    router.push({
      pathname: '/auth/email-login',
      params: { role },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Choose how you want to ride</Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* Customer Option */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('customer')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, styles.customerIcon]}>
            <Text style={styles.icon}>👤</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.roleTitle}>Book a Ride</Text>
            <Text style={styles.roleDescription}>
              Get to your destination safely
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        {/* Rider Option */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('rider')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, styles.driverIcon]}>
            <Text style={styles.icon}>🚗</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.roleTitle}>Drive & Earn</Text>
            <Text style={styles.roleDescription}>
              Make money on your schedule
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Safe & Reliable Rides</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#888888',
    textAlign: 'center',
    letterSpacing: 1,
  },
  optionsContainer: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerIcon: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  driverIcon: {
    backgroundColor: 'rgba(255, 45, 146, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 146, 0.3)',
  },
  icon: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
  },
  arrow: {
    fontSize: 24,
    color: Colors.neonBlue,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontSize: 12,
    color: '#444444',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
