/**
 * Firebase Configuration
 */

import auth from '@react-native-firebase/auth';

// Firebase Auth instance
export const firebaseAuth = auth;

// Helper to format phone number for Firebase (E.164 format)
export const formatPhoneForFirebase = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  // Add +91 for India
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return `+91${cleaned}`;
};

export default auth;
