import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../src/store/userStore';
import { useSocket } from '../src/context/WSProvider';
import { APP_VERSION } from '../src/config/environment';

const DARK = {
  bg: '#000000',
  bgSecondary: '#0a0a0a',
  card: '#111111',
  cardBorder: '#1a1a1a',
  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  neonBlue: '#00D9FF',
  neonPink: '#FF2D92',
  neonRed: '#FF4757',
  neonGreen: '#00FF88',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const { disconnect: disconnectSocket } = useSocket();

  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            disconnectSocket();
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to reach us?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@gadibulao.com'),
        },
        {
          text: 'Call',
          onPress: () => Linking.openURL('tel:+911234567890'),
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Gadi Bulao',
      `Version: ${APP_VERSION}\n\nGadi Bulao is a ride-hailing platform that connects riders with customers for convenient and affordable transportation.\n\nBuilt with React Native & Expo`,
      [{ text: 'OK' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'Our privacy policy ensures your data is protected. We collect minimal data required for providing ride services and never share your personal information with third parties without consent.',
      [{ text: 'OK' }]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      'Terms of Service',
      'By using Gadi Bulao, you agree to our terms of service. This includes safe conduct during rides, fair usage of the platform, and adherence to local transportation laws.',
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    showArrow = true,
    danger = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showArrow?: boolean;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
        <Ionicons name={icon as any} size={22} color={danger ? DARK.neonRed : DARK.neonBlue} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={DARK.textMuted} />
      ))}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => router.push('/profile')}
            />
            <SettingItem
              icon="time-outline"
              title="Ride History"
              subtitle="View your past rides"
              onPress={() => router.push('/history')}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="notifications-outline"
              title="Push Notifications"
              subtitle="Receive ride updates"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: DARK.cardBorder, true: DARK.neonBlue }}
                  thumbColor="#fff"
                />
              }
              showArrow={false}
            />
            <SettingItem
              icon="location-outline"
              title="Location Sharing"
              subtitle="Share location during rides"
              rightElement={
                <Switch
                  value={locationSharing}
                  onValueChange={setLocationSharing}
                  trackColor={{ false: DARK.cardBorder, true: DARK.neonBlue }}
                  thumbColor="#fff"
                />
              }
              showArrow={false}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help with your account"
              onPress={handleSupport}
            />
            <SettingItem
              icon="document-text-outline"
              title="Terms of Service"
              onPress={handleTerms}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={handlePrivacy}
            />
            <SettingItem
              icon="information-circle-outline"
              title="About"
              subtitle={`Version ${APP_VERSION}`}
              onPress={handleAbout}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="log-out-outline"
              title="Logout"
              onPress={handleLogout}
              showArrow={false}
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Gadi Bulao v{APP_VERSION}</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ in India</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: DARK.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: DARK.cardBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DARK.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DARK.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK.textSecondary,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: DARK.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: DARK.cardBorder,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: DARK.cardBorder,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconContainerDanger: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: DARK.text,
  },
  settingTitleDanger: {
    color: DARK.neonRed,
  },
  settingSubtitle: {
    fontSize: 13,
    color: DARK.textSecondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    color: DARK.textMuted,
  },
  footerSubtext: {
    fontSize: 12,
    color: DARK.textSecondary,
    marginTop: 4,
  },
});
