import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface OTPDisplayProps {
  otp: string;
  label: string;
  isActive?: boolean;
}

const OTPDisplay: React.FC<OTPDisplayProps> = ({
  otp,
  label,
  isActive = true,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
    }
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.container,
        isActive && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <LinearGradient
        colors={isActive ? ['#E3F2FD', '#BBDEFB'] : ['#f5f5f5', '#e0e0e0']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Ionicons
            name="key"
            size={18}
            color={isActive ? '#2196F3' : '#999'}
          />
          <Text style={[styles.label, !isActive && styles.labelInactive]}>
            {label}
          </Text>
        </View>
        <View style={styles.otpContainer}>
          {otp.split('').map((digit, index) => (
            <View
              key={index}
              style={[
                styles.digitBox,
                isActive && styles.digitBoxActive,
              ]}
            >
              <Text style={[styles.digit, !isActive && styles.digitInactive]}>
                {digit}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.helperText}>
          Share this code with your driver
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  labelInactive: {
    color: '#999',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  digitBoxActive: {
    borderColor: '#2196F3',
  },
  digit: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196F3',
  },
  digitInactive: {
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default OTPDisplay;
