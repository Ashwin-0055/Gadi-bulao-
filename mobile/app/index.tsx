import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../src/store/userStore';
import { Colors } from '../src/constants/colors';
import { useEffect } from 'react';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);

  // Auto-navigate if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.activeRole === 'customer') {
        router.replace('/customer/home');
      } else if (user.activeRole === 'rider') {
        router.replace('/rider/home');
      }
    }
  }, [isAuthenticated, user]);

  const handleRoleSelect = (role: 'customer' | 'rider') => {
    // Navigate to login with selected role
    router.push({
      pathname: '/auth/phone-login',
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
        <Text style={styles.title}>Gadi Bulao</Text>
        <Text style={styles.subtitle}>Your ride, your way</Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* Customer Option */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('customer')}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>👤</Text>
          </View>
          <Text style={styles.roleTitle}>I'm a Customer</Text>
          <Text style={styles.roleDescription}>
            Book rides and reach your destination safely
          </Text>
        </TouchableOpacity>

        {/* Rider Option */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('rider')}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚗</Text>
          </View>
          <Text style={styles.roleTitle}>I'm a Driver</Text>
          <Text style={styles.roleDescription}>
            Earn money by giving rides to customers
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Safe & Reliable Rides</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 20,
  },
  roleCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontSize: 12,
    color: Colors.textMuted,
  },
});
