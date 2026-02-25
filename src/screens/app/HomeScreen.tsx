import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { user, logOut } = useAuth();

  const firstName = user?.displayName?.split(' ')[0] ?? 'משתמש';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[700]} />

      {/* Top bar */}
      <LinearGradient
        colors={[COLORS.primary[700], COLORS.primary[600]]}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={logOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>יציאה</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>⚖️ תוביים.il</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]}</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>שלום, {firstName} 👋</Text>
          <Text style={styles.greetingSubtext}>מה נעשה היום?</Text>
        </View>

        {/* Main CTA Card */}
        <LinearGradient
          colors={[COLORS.primary[600], COLORS.primary[500]]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroIcon}>⚖️</Text>
          <Text style={styles.heroTitle}>פתח/י תביעה חדשה</Text>
          <Text style={styles.heroSubtext}>
            AI יראיין אותך ויבנה את התיק שלך בצורה מקצועית
          </Text>
          <Button
            label="התחל/י עכשיו"
            onPress={() => navigation.navigate('NewClaim')}
            style={styles.heroBtn}
            textStyle={{ color: COLORS.primary[700], fontWeight: '700' }}
          />
        </LinearGradient>

        {/* Feature cards */}
        <Text style={styles.sectionTitle}>מה אפשר לעשות?</Text>
        <View style={styles.featureGrid}>
          {[
            { icon: '🤖', title: 'ראיון AI', sub: 'שאלות מנחות לבניית התיק', screen: 'NewClaim' },
            { icon: '📄', title: 'כתב תביעה', sub: 'PDF מוכן לטופס 1', screen: 'NewClaim' },
            { icon: '🎯', title: 'מוק-טריאל', sub: 'תרגול עם שופט AI', screen: 'NewClaim' },
            { icon: '📁', title: 'הגשת ראיות', sub: 'תמונות ומסמכים', screen: 'NewClaim' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.featureCard}
              onPress={() => navigation.navigate('NewClaim')}
              activeOpacity={0.75}
            >
              <Text style={styles.featureCardIcon}>{item.icon}</Text>
              <Text style={styles.featureCardTitle}>{item.title}</Text>
              <Text style={styles.featureCardSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            💡 גבול תביעות קטנות: עד <Text style={{ fontWeight: '700' }}>38,800 ₪</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray[50] },

  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  logoutBtn:    { padding: SPACING.xs },
  logoutText:   { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.white },
  avatarBtn:    { padding: SPACING.xs },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  scroll:        { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  greeting:     { marginBottom: SPACING.lg },
  greetingText: { fontSize: 24, fontWeight: '800', color: COLORS.gray[800], textAlign: 'right' },
  greetingSubtext: { fontSize: 14, color: COLORS.gray[500], textAlign: 'right', marginTop: 2 },

  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  heroIcon:    { fontSize: 48, marginBottom: SPACING.sm },
  heroTitle:   { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: SPACING.xs },
  heroSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 22 },
  heroBtn: { backgroundColor: COLORS.white, width: '80%' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray[700], textAlign: 'right', marginBottom: SPACING.md },

  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureCardIcon:  { fontSize: 28, marginBottom: SPACING.xs },
  featureCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray[800], textAlign: 'center', marginBottom: 2 },
  featureCardSub:   { fontSize: 11, color: COLORS.gray[400], textAlign: 'center' },

  infoBanner: {
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  infoBannerText: { fontSize: 13, color: COLORS.primary[700], textAlign: 'center' },
});
