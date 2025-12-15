/**
 * App Color Palette
 * Uber-like color scheme
 */

export const Colors = {
  // Primary
  primary: '#000000',
  primaryLight: '#333333',
  primaryDark: '#000000',

  // Secondary
  secondary: '#FFFFFF',
  secondaryLight: '#F5F5F5',
  secondaryDark: '#E0E0E0',

  // Accent
  accent: '#00D9FF',  // Cyan accent
  accentLight: '#66E5FF',
  accentDark: '#00A3CC',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Grayscale
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Map
  mapBackground: '#F0F0F0',
  mapStroke: '#E0E0E0',
  routeColor: '#00D9FF',

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textLight: '#FFFFFF',
  textMuted: '#9CA3AF',

  // Background
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundDark: '#111827',

  // Border
  border: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Ride Status Colors
  rideSearching: '#F59E0B',
  rideAccepted: '#3B82F6',
  rideArrived: '#8B5CF6',
  rideStarted: '#10B981',
  rideCompleted: '#059669',
  rideCancelled: '#EF4444',
};

export const StatusColors = {
  SEARCHING: Colors.rideSearching,
  ACCEPTED: Colors.rideAccepted,
  ARRIVED: Colors.rideArrived,
  STARTED: Colors.rideStarted,
  COMPLETED: Colors.rideCompleted,
  CANCELLED: Colors.rideCancelled,
};

export type RideStatus = keyof typeof StatusColors;
