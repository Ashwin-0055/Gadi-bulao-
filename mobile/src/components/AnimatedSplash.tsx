/**
 * Animated Splash Screen
 * Modern neon-themed splash with smooth animations
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Neon colors matching the logo
const NEON_BLUE = '#00D9FF';
const NEON_PINK = '#FF2D92';
const NEON_RED = '#FF4757';

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotation = useSharedValue(-10);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);
  const taglineOpacity = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const screenFade = useSharedValue(1);

  useEffect(() => {
    // Sequence of animations

    // 1. Logo entrance with bounce
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(200, withSpring(1, {
      damping: 12,
      stiffness: 100,
    }));
    logoRotation.value = withDelay(200, withSpring(0, {
      damping: 15,
      stiffness: 100,
    }));

    // 2. Neon glow pulse effect
    glowOpacity.value = withDelay(600, withTiming(0.8, { duration: 400 }));
    glowScale.value = withDelay(600,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        3,
        true
      )
    );

    // 3. Text slide up and fade in
    textOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(800, withSpring(0, {
      damping: 15,
      stiffness: 100,
    }));

    // 4. Tagline fade in
    taglineOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));

    // 5. Particles/sparkles
    particleOpacity.value = withDelay(1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
        ),
        4,
        true
      )
    );

    // 6. Fade out and complete
    setTimeout(() => {
      screenFade.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      });
    }, 2800);
  }, []);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const particleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenFade.value,
  }));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#000000']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background particles/sparkles */}
      <Animated.View style={[styles.particlesContainer, particleAnimatedStyle]}>
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                left: `${10 + (i % 4) * 25}%`,
                top: `${15 + Math.floor(i / 4) * 30}%`,
                backgroundColor: i % 3 === 0 ? NEON_BLUE : i % 3 === 1 ? NEON_PINK : NEON_RED,
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Glow effect behind logo */}
      <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
        <LinearGradient
          colors={[`${NEON_BLUE}40`, `${NEON_PINK}30`, 'transparent']}
          style={styles.glow}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App name with glow */}
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Animated.Text style={styles.title}>Gadi Bulao</Animated.Text>
        <View style={styles.titleGlow} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
        Your ride, your way
      </Animated.Text>

      {/* Bottom neon line */}
      <Animated.View style={[styles.bottomLine, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={[NEON_BLUE, NEON_PINK, NEON_RED]}
          style={styles.lineGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    borderRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  glowContainer: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.45,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 20,
  },
  textContainer: {
    position: 'relative',
    marginTop: 10,
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: NEON_BLUE,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 2,
  },
  titleGlow: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: NEON_BLUE,
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    borderRadius: 1,
  },
  tagline: {
    marginTop: 15,
    fontSize: 16,
    color: '#888888',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 50,
    width: width * 0.4,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  lineGradient: {
    flex: 1,
  },
});
