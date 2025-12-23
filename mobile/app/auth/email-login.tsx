/**
 * Email Login Screen with Secure OTP Authentication
 *
 * Security Features:
 * - OTP hashed on server
 * - 5-minute OTP expiry
 * - 5 attempt limit (locks for 30 min)
 * - Rate limiting (3 requests per 10 min)
 * - Email validation
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CustomButton } from '../../src/components/shared/CustomButton';
import { Colors } from '../../src/constants/colors';
import { api } from '../../src/services/apiClient';
import { useUserStore } from '../../src/store/userStore';

type Step = 'email' | 'otp' | 'name' | 'phone' | 'vehicle';

export default function EmailLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role || 'customer') as 'customer' | 'rider';

  // State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  // Vehicle details for riders
  const [vehicleType, setVehicleType] = useState<'bike' | 'auto' | 'cab'>('cab');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const login = useUserStore((state) => state.login);

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Send OTP to email
  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.auth.sendOtp(email.toLowerCase().trim());

      if (response.data?.success) {
        setIsNewUser(response.data.data?.isNewUser || false);
        setStep('otp');
        Alert.alert('OTP Sent', `Verification code sent to ${email}`);
      } else {
        throw new Error(response.data?.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('Send OTP error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For existing users, verify and login directly
      // For new users, just verify OTP first
      const response = await api.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        otp,
      });

      if (response.data?.success) {
        if (response.data.data?.requiresRegistration) {
          // New user - needs to provide name
          setIsNewUser(true);
          setStep('name');
        } else if (response.data.data?.tokens) {
          // Existing user - login successful
          const { tokens, user } = response.data.data;
          await login(tokens, user);

          setTimeout(() => {
            if (user.activeRole === 'customer') {
              router.replace('/customer/home');
            } else {
              router.replace('/rider/home');
            }
          }, 100);
        }
      } else {
        throw new Error(response.data?.message || 'Invalid OTP');
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Invalid OTP';
      setError(errorMessage);

      // Show remaining attempts if available
      if (err.response?.data?.remainingAttempts !== undefined) {
        Alert.alert('Error', `${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle name submission
  const handleNameSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setStep('phone');
  };

  // Handle phone submission
  const handlePhoneSubmit = () => {
    if (phone && phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    if (role === 'rider') {
      setStep('vehicle');
    } else {
      completeRegistration();
    }
  };

  // Validate vehicle details
  const validateVehicleDetails = () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter your vehicle number');
      return false;
    }
    if (!vehicleModel.trim()) {
      Alert.alert('Error', 'Please enter your vehicle model');
      return false;
    }
    return true;
  };

  // Complete registration for new users
  const completeRegistration = async () => {
    if (role === 'rider' && !validateVehicleDetails()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registerPayload: any = {
        email: email.toLowerCase().trim(),
        otp: '000000', // Dummy OTP - backend uses isEmailVerified flag instead
        name: name.trim(),
        phone: phone || undefined,
        role,
      };

      if (role === 'rider') {
        registerPayload.vehicle = {
          type: vehicleType,
          model: vehicleModel.trim(),
          plateNumber: vehicleNumber.trim().toUpperCase(),
          color: vehicleColor.trim() || 'White',
        };
      }

      const response = await api.auth.verifyOtp(registerPayload);

      if (response.data?.success) {
        const { tokens, user } = response.data.data;
        await login(tokens, user);

        setTimeout(() => {
          if (role === 'customer') {
            router.replace('/customer/home');
          } else {
            router.replace('/rider/home');
          }
        }, 100);
      } else {
        throw new Error(response.data?.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'email':
        return 'Enter your email';
      case 'otp':
        return 'Enter verification code';
      case 'name':
        return "What's your name?";
      case 'phone':
        return 'Phone number (optional)';
      case 'vehicle':
        return 'Vehicle Details';
      default:
        return '';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'email':
        return "We'll send you a verification code";
      case 'otp':
        return `Enter the 6-digit code sent to ${email}`;
      case 'name':
        return 'This will be shown to your ' + (role === 'customer' ? 'driver' : 'customers');
      case 'phone':
        return 'For ride communication (can skip)';
      case 'vehicle':
        return 'Enter your vehicle information';
      default:
        return '';
    }
  };

  const handleBack = () => {
    if (step === 'vehicle') {
      setStep('phone');
    } else if (step === 'phone') {
      setStep('name');
    } else if (step === 'name') {
      setStep('otp');
    } else if (step === 'otp') {
      setStep('email');
      setOtp('');
    } else {
      router.back();
    }
  };

  const getButtonTitle = () => {
    switch (step) {
      case 'email':
        return 'Send OTP';
      case 'otp':
        return 'Verify OTP';
      case 'name':
        return 'Continue';
      case 'phone':
        return role === 'rider' ? 'Continue' : 'Complete';
      case 'vehicle':
        return 'Register';
      default:
        return 'Continue';
    }
  };

  const getButtonAction = () => {
    switch (step) {
      case 'email':
        return handleSendOTP;
      case 'otp':
        return handleVerifyOTP;
      case 'name':
        return handleNameSubmit;
      case 'phone':
        return handlePhoneSubmit;
      case 'vehicle':
        return completeRegistration;
      default:
        return handleSendOTP;
    }
  };

  const isButtonDisabled = () => {
    switch (step) {
      case 'email':
        return !email.trim() || !isValidEmail(email);
      case 'otp':
        return otp.length !== 6;
      case 'name':
        return !name.trim();
      case 'phone':
        return false; // Phone is optional
      case 'vehicle':
        return !vehicleNumber.trim() || !vehicleModel.trim();
      default:
        return false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            {step === 'email' && (
              <View style={styles.emailContainer}>
                <View style={styles.inputField}>
                  <Text style={styles.emoji}>📧</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            )}

            {step === 'otp' && (
              <View style={styles.otpContainer}>
                <View style={styles.otpInputContainer}>
                  <TextInput
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity
                  onPress={handleSendOTP}
                  style={styles.resendButton}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'name' && (
              <View style={styles.nameInputContainer}>
                <Text style={styles.emailDisplay}>{email}</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.emoji}>👤</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your name"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.textInput}
                      autoFocus
                    />
                  </View>
                </View>
              </View>
            )}

            {step === 'phone' && (
              <View style={styles.phoneInputContainer}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      value={phone}
                      onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter phone number"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.textInput}
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoFocus
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (role === 'rider') {
                      setStep('vehicle');
                    } else {
                      completeRegistration();
                    }
                  }}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'vehicle' && (
              <View style={styles.vehicleContainer}>
                {/* Vehicle Type */}
                <View style={styles.vehicleInput}>
                  <Text style={styles.inputLabel}>Vehicle Type</Text>
                  <View style={styles.vehicleTypeContainer}>
                    {(['bike', 'auto', 'cab'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.vehicleTypeButton,
                          vehicleType === type && styles.vehicleTypeButtonActive,
                        ]}
                        onPress={() => setVehicleType(type)}
                      >
                        <Text style={styles.vehicleTypeEmoji}>
                          {type === 'bike' ? '🏍️' : type === 'auto' ? '🛺' : '🚗'}
                        </Text>
                        <Text
                          style={[
                            styles.vehicleTypeText,
                            vehicleType === type && styles.vehicleTypeTextActive,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Vehicle Number */}
                <View style={styles.vehicleInput}>
                  <Text style={styles.inputLabel}>Vehicle Number *</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.emoji}>🔢</Text>
                    <TextInput
                      value={vehicleNumber}
                      onChangeText={setVehicleNumber}
                      placeholder="e.g., DL 01 AB 1234"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.textInput}
                      autoCapitalize="characters"
                      autoFocus
                    />
                  </View>
                </View>

                {/* Vehicle Model */}
                <View style={styles.vehicleInput}>
                  <Text style={styles.inputLabel}>Vehicle Model *</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.emoji}>🚘</Text>
                    <TextInput
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                      placeholder="e.g., Maruti Swift"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* Vehicle Color */}
                <View style={styles.vehicleInput}>
                  <Text style={styles.inputLabel}>Vehicle Color (Optional)</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.emoji}>🎨</Text>
                    <TextInput
                      value={vehicleColor}
                      onChangeText={setVehicleColor}
                      placeholder="e.g., White"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.textInput}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Action Button */}
          <View style={styles.footer}>
            <CustomButton
              title={getButtonTitle()}
              onPress={getButtonAction()}
              loading={loading}
              disabled={isButtonDisabled()}
              size="large"
            />

            <Text style={styles.disclaimer}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  inputSection: {
    flex: 1,
    justifyContent: 'center',
  },
  emailContainer: {
    gap: 12,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  emoji: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  errorText: {
    color: Colors.error || '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  otpContainer: {
    alignItems: 'center',
    gap: 16,
  },
  otpInputContainer: {
    width: '100%',
    maxWidth: 280,
  },
  otpInput: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.gray100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray200,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  resendButton: {
    marginTop: 8,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  nameInputContainer: {
    gap: 20,
  },
  emailDisplay: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  phoneInputContainer: {
    gap: 16,
  },
  skipButton: {
    alignSelf: 'center',
    padding: 8,
  },
  skipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleContainer: {
    gap: 16,
  },
  vehicleInput: {
    gap: 8,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleTypeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.gray200,
    alignItems: 'center',
    gap: 4,
  },
  vehicleTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight || '#E8F5E9',
  },
  vehicleTypeEmoji: {
    fontSize: 28,
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  vehicleTypeTextActive: {
    color: Colors.primary,
  },
  footer: {
    gap: 16,
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
