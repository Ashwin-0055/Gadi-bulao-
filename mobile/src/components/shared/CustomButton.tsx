/**
 * Custom Button Component
 * Modern button with animations, gradients, and variants
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// Use Pressable for web for better compatibility
const ButtonPressable = Platform.OS === 'web' ? Pressable : TouchableOpacity;

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case 'primary':
        return ['#00D9FF', '#0099CC']; // Neon blue gradient
      case 'success':
        return ['#10B981', '#059669'];
      case 'danger':
        return ['#FF4757', '#CC2936'];
      case 'secondary':
        return ['#1a1a1a', '#111111'];
      default:
        return ['transparent', 'transparent'];
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
        return '#00D9FF'; // Neon blue
      case 'secondary':
        return '#FFFFFF';
      default:
        return '#000000'; // Dark text on neon buttons
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 22;
      default:
        return 18;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large':
        return { paddingVertical: 18, paddingHorizontal: 32 };
      default:
        return { paddingVertical: 14, paddingHorizontal: 24 };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {icon && iconPosition === 'left' && !loading && (
        <Ionicons
          name={icon}
          size={getIconSize()}
          color={getTextColor()}
          style={styles.iconLeft}
        />
      )}
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'secondary' ? Colors.primary : '#fff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { color: getTextColor(), fontSize: getFontSize() },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
      {icon && iconPosition === 'right' && !loading && (
        <Ionicons
          name={icon}
          size={getIconSize()}
          color={getTextColor()}
          style={styles.iconRight}
        />
      )}
    </View>
  );

  if (variant === 'outline') {
    return (
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        <ButtonPressable
          style={[
            styles.button,
            styles.outlineButton,
            getSizeStyles(),
            disabled && styles.disabled,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
        >
          {renderContent()}
        </ButtonPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <ButtonPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[disabled && styles.disabled]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            styles.gradientButton,
            getSizeStyles(),
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </ButtonPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientButton: {
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default CustomButton;
