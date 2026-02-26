import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import type { TabParamList, AppStackParamList } from '../../types/navigation';
import {
  Colors, Typography, Spacing, Radius, Shadows,
  SCREEN_PADDING, SECTION_GAP,
} from '../../theme';
import { Card } from '../../components/ui/Card';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'ProfileTab'>,
  NativeStackScreenProps<AppStackParamList>
>;

interface MenuItemProps {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, sub, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.menuArrow}>{'\u2190'}</Text>
    </TouchableOpacity>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const { user, logOut } = useAuth();
  const insets = useSafeAreaInsets();

  const displayName = user?.displayName ?? '';
  const email = user?.email ?? '';
  const initials = displayName ? displayName[0] : '?';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>{'\u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05D9'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <LinearGradient colors={Colors.gradientPurple} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
            </View>
          </View>
        </Card>

        {/* General section */}
        <Text style={styles.sectionTitle}>{'\u05DB\u05DC\u05DC\u05D9'}</Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon={'\uD83D\uDCCB'}
            label={'\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9'}
            sub={'\u05EA\u05E0\u05D0\u05D9 \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05E9\u05DC \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4'}
            onPress={() => navigation.navigate('Terms')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={'\uD83D\uDD12'}
            label={'\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA'}
            sub={'\u05D0\u05D9\u05DA \u05D0\u05E0\u05D7\u05E0\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC\u05DA'}
            onPress={() => navigation.navigate('Privacy')}
          />
        </Card>

        {/* About section */}
        <Text style={styles.sectionTitle}>{'\u05D0\u05D5\u05D3\u05D5\u05EA'}</Text>
        <Card style={styles.menuCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{'\u05D2\u05E8\u05E1\u05D4'}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{'\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4'}</Text>
            <Text style={styles.aboutValue}>Expo SDK 54</Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>AI</Text>
            <Text style={styles.aboutValue}>Gemini 2.5 Flash Lite</Text>
          </View>
        </Card>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>{'\u05D7\u05E9\u05D1\u05D5\u05DF'}</Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon={'\uD83D\uDEAA'}
            label={'\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA'}
            onPress={() => logOut()}
            danger
          />
        </Card>

        {/* Legal disclaimer */}
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimer}>
            {'\uD83E\uDD16 \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DE\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1-AI \u05D5\u05D0\u05D9\u05E0\u05D4 \u05DE\u05D7\u05DC\u05D9\u05E4\u05D4 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9.'}
          </Text>
          <Text style={styles.disclaimer}>
            {'\u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA \xA9 toviim.il'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  // Header
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'right',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING },

  // Profile card
  profileCard: { marginBottom: SECTION_GAP },
  profileRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.base,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.white },
  profileInfo: { flex: 1 },
  profileName: { ...Typography.h3, color: Colors.text, textAlign: 'right' },
  profileEmail: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },

  // Section
  sectionTitle: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Menu card
  menuCard: { marginBottom: Spacing.base, paddingHorizontal: 0, paddingVertical: 0 },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: Colors.dangerLight,
  },
  menuIcon: { fontSize: 18 },
  menuContent: { flex: 1 },
  menuLabel: { ...Typography.body, color: Colors.text, textAlign: 'right' },
  menuSub: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 1 },
  menuArrow: { fontSize: 16, color: Colors.gray300 },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.base },

  // About
  aboutRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  aboutLabel: { ...Typography.body, color: Colors.text },
  aboutValue: { ...Typography.caption, color: Colors.muted },

  // Disclaimer
  disclaimerWrap: { marginTop: SECTION_GAP, alignItems: 'center' },
  disclaimer: {
    ...Typography.tiny,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
});
