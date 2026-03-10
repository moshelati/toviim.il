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
      <Text style={styles.menuArrow}>←</Text>
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
        <Text style={styles.headerTitle}>החשבון שלי</Text>
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
        <Text style={styles.sectionTitle}>כללי</Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="📋"
            label="תנאי שימוש"
            sub="תנאי השימוש של האפליקציה"
            onPress={() => navigation.navigate('Terms')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="🔒"
            label="מדיניות פרטיות"
            sub="איך אנחנו משתמשים בנתונים שלך"
            onPress={() => navigation.navigate('Privacy')}
          />
        </Card>

        {/* About section */}
        <Text style={styles.sectionTitle}>אודות</Text>
        <Card style={styles.menuCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>גרסה</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>פלטפורמה</Text>
            <Text style={styles.aboutValue}>Expo SDK 54</Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>AI</Text>
            <Text style={styles.aboutValue}>Gemini 2.5 Flash Lite</Text>
          </View>
        </Card>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>חשבון</Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="🚪"
            label="התנתקות"
            onPress={() => logOut()}
            danger
          />
        </Card>

        {/* Legal disclaimer */}
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimer}>
            🤖 האפליקציה משתמשת ב-AI ואינה מחליפה ייעוץ משפטי מקצועי.
          </Text>
          <Text style={styles.disclaimer}>
            כל הזכויות שמורות © toviim.il
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
