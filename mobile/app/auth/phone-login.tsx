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
import { PhoneInput } from '../../src/components/shared/PhoneInput';
import { CustomButton } from '../../src/components/shared/CustomButton';
import { Colors } from '../../src/constants/colors';
import { api } from '../../src/services/apiClient';
import { useUserStore } from '../../src/store/userStore';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role || 'customer') as 'customer' | 'rider';

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'name' | 'vehicle'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Vehicle details for riders
  const [vehicleType, setVehicleType] = useState<'bike' | 'auto' | 'cab'>('cab');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const login = useUserStore((state) => state.login);

  const validatePhone = () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    setError('');
    return true;
  };

  const handlePhoneSubmit = () => {
    if (validatePhone()) {
      setStep('name');
    }
  };

  const handleNameSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    // For riders, go to vehicle registration step
    if (role === 'rider') {
      setStep('vehicle');
    } else {
      // For customers, login directly
      handleLogin();
    }
  };

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

  const handleLogin = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (role === 'rider' && !validateVehicleDetails()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/^\+91/, '').replace(/^91/, '').trim();

      const loginPayload: any = {
        phone: cleanPhone,
        name: name.trim(),
        role,
      };

      if (role === 'rider') {
        loginPayload.vehicle = {
          type: vehicleType,
          model: vehicleModel.trim(),
          plateNumber: vehicleNumber.trim().toUpperCase(),
          color: vehicleColor.trim() || 'White',
        };
      }

      const response = await api.auth.login(loginPayload);

      if (response.data && response.data.data) {
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
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'phone':
        return 'Enter your phone number';
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
        return "We'll send you a verification code";
      case 'name':
        return 'This will be shown to your ' + (role === 'customer' ? 'driver' : 'customers');
      case 'vehicle':
        return 'Enter your vehicle information so customers can find you';
      default:
        return '';
    }
  };

  const handleBack = () => {
    if (step === 'vehicle') {
      setStep('name');
    } else if (step === 'name') {
      setStep('phone');
    } else {
      router.back();
    }
  };

  const getButtonTitle = () => {
    switch (step) {
      case 'phone':
        return 'Continue';
      case 'name':
        return role === 'rider' ? 'Continue' : 'Login';
      case 'vehicle':
        return 'Register & Login';
      default:
        return 'Continue';
    }
  };

  const getButtonAction = () => {
    switch (step) {
      case 'phone':
        return handlePhoneSubmit;
      case 'name':
        return handleNameSubmit;
      case 'vehicle':
        return handleLogin;
      default:
        return handlePhoneSubmit;
    }
  };

  const isButtonDisabled = () => {
    switch (step) {
      case 'phone':
        return phone.length < 10;
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

                {/* Vehicle Color (Optional) */}
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
