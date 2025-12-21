/**
 * Phone Login Screen with Firebase OTP Authentication
 */

import { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { PhoneInput } from '../../src/components/shared/PhoneInput';
import { CustomButton } from '../../src/components/shared/CustomButton';
import { Colors } from '../../src/constants/colors';
import { api } from '../../src/services/apiClient';
import { useUserStore } from '../../src/store/userStore';
import { formatPhoneForFirebase } from '../../src/config/firebase';

type Step = 'phone' | 'otp' | 'name' | 'vehicle';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role || 'customer') as 'customer' | 'rider';

  // State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  // Firebase confirmation result
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

  // Vehicle details for riders
  const [vehicleType, setVehicleType] = useState<'bike' | 'auto' | 'cab'>('cab');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const login = useUserStore((state) => state.login);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user && step === 'otp') {
        // User signed in via Firebase, now sync with backend
        await syncWithBackend(user);
      }
    });

    return unsubscribe;
  }, [step]);

  // Send OTP via Firebase
  const handleSendOTP = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneForFirebase(phone);
      console.log('Sending OTP to:', formattedPhone);

      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setConfirm(confirmation);
      setStep('otp');
      Alert.alert('OTP Sent', `Verification code sent to ${formattedPhone}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      let errorMessage = 'Failed to send OTP. Please try again.';

      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      }

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

    if (!confirm) {
      setError('Please request OTP first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await confirm.confirm(otp);

      if (credential.user) {
        // Firebase verification successful
        // The onAuthStateChanged will handle syncing with backend
        console.log('Firebase auth successful:', credential.user.phoneNumber);
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      let errorMessage = 'Invalid OTP. Please try again.';

      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code.';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = 'OTP expired. Please request a new one.';
      }

      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  // Sync Firebase user with backend
  const syncWithBackend = async (firebaseUser: FirebaseAuthTypes.User) => {
    setLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      const response = await api.auth.firebaseSync({
        phone: cleanPhone,
        role,
        firebaseToken: idToken,
        firebaseUid: firebaseUser.uid,
      });

      if (response.data?.success) {
        const { tokens, user } = response.data.data;
        await login(tokens, user);

        setTimeout(() => {
          if (user.activeRole === 'customer') {
            router.replace('/customer/home');
          } else {
            router.replace('/rider/home');
          }
        }, 100);
      } else {
        // User exists in Firebase but not in our backend - need to register
        setIsNewUser(true);
        setStep('name');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      // If sync fails, treat as new user
      setIsNewUser(true);
      setStep('name');
      setLoading(false);
    }
  };

  // Handle name submission
  const handleNameSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
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
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const idToken = await currentUser.getIdToken();
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      const registerPayload: any = {
        phone: cleanPhone,
        name: name.trim(),
        role,
        firebaseToken: idToken,
        firebaseUid: currentUser.uid,
      };

      if (role === 'rider') {
        registerPayload.vehicle = {
          type: vehicleType,
          model: vehicleModel.trim(),
          plateNumber: vehicleNumber.trim().toUpperCase(),
          color: vehicleColor.trim() || 'White',
        };
      }

      const response = await api.auth.firebaseRegister(registerPayload);

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
      case 'phone':
        return 'Enter your phone number';
      case 'otp':
        return 'Enter verification code';
      case 'name':
        return "What's your name?";
      case 'vehicle':
        return 'Vehicle Details';
      default:
        return '';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'phone':
        return "We'll send you a verification code via SMS";
      case 'otp':
        return `Enter the 6-digit code sent to +91 ${phone}`;
      case 'name':
        return 'This will be shown to your ' + (role === 'customer' ? 'driver' : 'customers');
      case 'vehicle':
        return 'Enter your vehicle information';
      default:
        return '';
    }
  };

  const handleBack = () => {
    if (step === 'vehicle') {
      setStep('name');
    } else if (step === 'name') {
      setStep('otp');
    } else if (step === 'otp') {
      setStep('phone');
      setOtp('');
      setConfirm(null);
    } else {
      router.back();
    }
  };

  const getButtonTitle = () => {
    switch (step) {
      case 'phone':
        return 'Send OTP';
      case 'otp':
        return 'Verify OTP';
      case 'name':
        return role === 'rider' ? 'Continue' : 'Complete';
      case 'vehicle':
        return 'Register';
      default:
        return 'Continue';
    }
  };

  const getButtonAction = () => {
    switch (step) {
      case 'phone':
        return handleSendOTP;
      case 'otp':
        return handleVerifyOTP;
      case 'name':
        return handleNameSubmit;
      case 'vehicle':
        return completeRegistration;
      default:
        return handleSendOTP;
    }
  };

  const isButtonDisabled = () => {
    switch (step) {
      case 'phone':
        return phone.length < 10;
      case 'otp':
        return otp.length !== 6;
      case 'name':
        return !name.trim();
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
            {step === 'phone' && (
              <PhoneInput
                value={phone}
                onChangeText={setPhone}
                error={error}
                autoFocus
              />
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
                <Text style={styles.phoneDisplay}>+91 {phone}</Text>
                <View style={styles.nameInput}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <View style={styles.nameInputField}>
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
                  <View style={styles.nameInputField}>
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
                  <View style={styles.nameInputField}>
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
                  <View style={styles.nameInputField}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
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
  errorText: {
    color: Colors.error || '#DC2626',
    fontSize: 14,
    textAlign: 'center',
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
  phoneDisplay: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  nameInput: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  nameInputField: {
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
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 0,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
});
