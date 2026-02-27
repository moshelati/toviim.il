import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
  Animated, Easing, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { getUserClaims } from '../../lib/claimsService';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS, formatNIS } from '../../config/legal';
import { Claim } from '../../types/claim';
import type { TabParamList, AppStackParamList } from '../../types/navigation';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING, SECTION_GAP } from '../../theme';
import { Card } from '../../components/ui/Card';
import { ProgressRing, getScoreColor } from '../../components/ui/ProgressRing';
import { Badge } from '../../components/ui/Badge';
import { HomeSkeleton } from '../../components/ui/Skeleton';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'HomeTab'>,
  NativeStackScreenProps<AppStackParamList>
>;

const CLAIM_TYPE_HE: Record<string, string> = {
  consumer: 'צרכנות',
  landlord: 'שכירות',
  employer: 'עבודה',
  neighbor: 'שכנים',
  contract: 'חוזה',
  other:    'אחר',
};

const CLAIM_TYPE_EMOJI: Record<string, string> = {
  consumer: '🛒',
  landlord: '🏠',
  employer: '💼',
  neighbor: '🏘️',
  contract: '📝',
  other:    '⚖️',
};

// ─── Carousel items — common small claims scenarios ─────────────
const CAROUSEL_ITEMS = [
  { emoji: '🛒', text: 'מוצר פגום? קבל החזר' },
  { emoji: '🏠', text: 'פיקדון שלא הוחזר' },
  { emoji: '🔊', text: 'מטרדי רעש משכנים' },
  { emoji: '💼', text: 'שכר שלא שולם' },
  { emoji: '🔧', text: 'קבלן שלא סיים' },
  { emoji: '💳', text: 'חיוב כפול בכרטיס' },
  { emoji: '🏥', text: 'ביטוח שמסרב לפצות' },
  { emoji: '📱', text: 'שירות לקוחות גרוע' },
  { emoji: '🚗', text: 'נזק מתאונה קלה' },
  { emoji: '✈️', text: 'טיסה שבוטלה' },
];

const CAROUSEL_CARD_W = 200;
const CAROUSEL_GAP = 12;
/** Distance for one full set of items — we triple items for seamless loop */
const ONE_SET_WIDTH = CAROUSEL_ITEMS.length * (CAROUSEL_CARD_W + CAROUSEL_GAP);

// ─── Greeting helper ─────────────────────────────────────────────
function getGreeting(): { emoji: string; text: string } {
  const hour = new Date().getHours();
  if (hour < 6)  return { emoji: '🌙', text: 'לילה טוב' };
  if (hour < 12) return { emoji: '☀️', text: 'בוקר טוב' };
  if (hour < 17) return { emoji: '🌤️', text: 'צהריים טובים' };
  if (hour < 21) return { emoji: '🌅', text: 'ערב טוב' };
  return { emoji: '🌙', text: 'לילה טוב' };
}

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const greeting = getGreeting();

  // ── Carousel auto-scroll animation ──
  const carouselAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(carouselAnim, {
        toValue: -ONE_SET_WIDTH,
        duration: ONE_SET_WIDTH * 28,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [carouselAnim]);

  // ── Claims loading ──
  const loadClaims = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getUserClaims(user.uid);
      setClaims(result);
    } catch { /* silent */ }
    finally { setLoadingClaims(false); }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadClaims();
    }, [loadClaims])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClaims();
    setRefreshing(false);
  }, [loadClaims]);

  const activeClaim = claims.find(c => c.status === 'chat' || c.status === 'evidence' || c.status === 'review');
  const recentClaims = claims.slice(0, 3);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>תובעים.il</Text>
            <Text style={styles.headerSub}>⚖️ עוזר AI לתביעות קטנות</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Greeting — right-aligned with separated emoji */}
        <View style={styles.greeting}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
            <Text style={styles.greetingText}>
              {firstName ? `${greeting.text}, ${firstName}` : greeting.text}
            </Text>
          </View>
          <Text style={styles.greetingSub}>
            הכלי החכם שלך לתביעות קטנות
          </Text>
        </View>

        {/* Auto-scrolling carousel — common claims */}
        <Text style={styles.carouselLabel}>
          אפשר לתבוע על...
        </Text>
        <View style={styles.carouselWrap}>
          <Animated.View
            style={[
              styles.carouselTrack,
              { transform: [{ translateX: carouselAnim }] },
            ]}
          >
            {[...CAROUSEL_ITEMS, ...CAROUSEL_ITEMS, ...CAROUSEL_ITEMS].map((item, i) => (
              <View key={i} style={styles.carouselCard}>
                <Text style={styles.carouselEmoji}>{item.emoji}</Text>
                <Text style={styles.carouselText} numberOfLines={1}>{item.text}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Hero CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('NewClaim')}
        >
          <LinearGradient
            colors={Colors.gradientHero}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroIcon}>⚖</Text>
            </View>
            <Text style={styles.heroTitle}>תביעה חדשה</Text>
            <Text style={styles.heroSub}>
              תוך 15 דקות תצא/י עם PDF + נספחים
            </Text>
            <View style={styles.heroBtnWrap}>
              <Text style={styles.heroBtnText}>התחל עכשיו</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Continue last claim */}
        {activeClaim && (
          <Card
            onPress={() => {
              if (activeClaim.status === 'chat') {
                navigation.navigate('ClaimChat', { claimId: activeClaim.id, claimType: activeClaim.claimType ?? '' });
              } else {
                navigation.navigate('ClaimDetail', { claimId: activeClaim.id });
              }
            }}
            style={styles.continueCard}
          >
            <View style={styles.continueRow}>
              <View style={styles.continueInfo}>
                <Text style={styles.continueLabel}>המשך את התיק</Text>
                <Text style={styles.continueTitle}>
                  {CLAIM_TYPE_EMOJI[activeClaim.claimType ?? ''] ?? '⚖️'}{' '}
                  {CLAIM_TYPE_HE[activeClaim.claimType ?? ''] ?? 'תביעה'}
                </Text>
                <Badge
                  label={activeClaim.status === 'chat' ? 'בראיון' : 'בעריכה'}
                  variant={activeClaim.status === 'chat' ? 'warning' : 'primary'}
                  style={{ marginTop: 6 }}
                />
              </View>
              <ProgressRing
                score={activeClaim.readinessScore ?? 0}
                size={60}
                strokeWidth={5}
              />
            </View>
          </Card>
        )}

        {/* Recent claims preview */}
        {loadingClaims ? (
          <HomeSkeleton />
        ) : recentClaims.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>תביעות אחרונות</Text>
              {claims.length > 3 && (
                <TouchableOpacity onPress={() => navigation.navigate('ClaimsTab' as any)}>
                  <Text style={styles.seeAllLink}>ראה הכל ({claims.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentClaims.map(c => {
              const score = c.readinessScore ?? 0;
              const scoreColor = getScoreColor(score);
              const typeLabel = CLAIM_TYPE_HE[c.claimType ?? ''] ?? 'תביעה';
              const typeEmoji = CLAIM_TYPE_EMOJI[c.claimType ?? ''] ?? '⚖️';
              const statusLabel =
                c.status === 'chat' ? 'בראיון' :
                c.status === 'review' ? 'בעריכה' :
                c.status === 'draft' ? 'טיוטה' :
                c.status === 'ready' ? 'מוכן' :
                c.status === 'exported' ? 'יוצא' : 'פתוח';

              return (
                <Card
                  key={c.id}
                  onPress={() => {
                    if (c.status === 'chat') {
                      navigation.navigate('ClaimChat', { claimId: c.id, claimType: c.claimType ?? '' });
                    } else {
                      navigation.navigate('ClaimDetail', { claimId: c.id });
                    }
                  }}
                  style={styles.claimCard}
                >
                  <View style={styles.claimRow}>
                    <View style={[styles.claimEmoji, { backgroundColor: scoreColor + '15' }]}>
                      <Text style={styles.claimEmojiText}>{typeEmoji}</Text>
                    </View>
                    <View style={styles.claimInfo}>
                      <Text style={styles.claimTitle}>{typeLabel}</Text>
                      <Text style={styles.claimSub} numberOfLines={1}>
                        {c.plaintiffName ?? c.plaintiff?.fullName ?? ''}
                        {c.defendant || c.defendants?.[0]?.name ? ` נגד ${c.defendant || c.defendants?.[0]?.name}` : ''}
                      </Text>
                    </View>
                    <View style={styles.claimRight}>
                      <Badge label={statusLabel} variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'muted'} />
                      <Text style={[styles.scoreSmall, { color: scoreColor }]}>{score}%</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        ) : null}

        {/* Feature tiles */}
        <Text style={styles.sectionTitle}>הכלים שלך</Text>
        <View style={styles.tileGrid}>
          {[
            { emoji: '🤖', title: 'ראיון AI', sub: 'שאלות מנחות לבניית התיק', onPress: () => navigation.navigate('NewClaim') },
            { emoji: '📄', title: 'כתב תביעה', sub: 'PDF מוכן לטופס 1', onPress: () => navigation.navigate('NewClaim') },
            { emoji: '⚖️', title: 'מוק-טריאל', sub: 'תרגול עם שופט AI', onPress: () => navigation.navigate('NewClaim') },
            { emoji: '📖', title: 'מדריך', sub: 'איך מגישים תביעה', onPress: () => navigation.navigate('GuideTab' as any) },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.tile}
              onPress={item.onPress}
              activeOpacity={0.85}
            >
              <View style={styles.tileIconWrap}>
                <Text style={styles.tileEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.tileTitle}>{item.title}</Text>
              <Text style={styles.tileSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            ℹ גבול תביעות קטנות: עד <Text style={{ fontWeight: '700' }}>{formatNIS(SMALL_CLAIMS_MAX_AMOUNT_NIS)}</Text>
          </Text>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          🤖 האפליקציה משתמשת ב-AI ואינה מחליפה ייעוץ משפטי מקצועי
        </Text>
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
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'right',
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 2,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING },

  // Greeting — emoji separated for proper RTL alignment
  greeting: { marginBottom: SECTION_GAP },
  greetingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  greetingEmoji: { fontSize: 28 },
  greetingText: {
    ...Typography.h2,
    color: Colors.text,
  },
  greetingSub: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },

  // Carousel
  carouselLabel: {
    ...Typography.bodyLarge,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  carouselWrap: {
    overflow: 'hidden',
    marginHorizontal: -SCREEN_PADDING,
    marginBottom: SECTION_GAP,
    height: 48,
  },
  carouselTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CAROUSEL_GAP,
    height: 48,
    paddingHorizontal: 4,
  },
  carouselCard: {
    width: CAROUSEL_CARD_W,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  carouselEmoji: { fontSize: 18 },
  carouselText: {
    ...Typography.small,
    color: Colors.primaryDark,
    flex: 1,
    textAlign: 'right',
  },

  // Hero
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: SECTION_GAP,
    ...Shadows.xl,
  },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroIcon: { fontSize: 32 },
  heroTitle: { ...Typography.h2, color: Colors.white, marginBottom: Spacing.xs },
  heroSub: {
    ...Typography.small, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22,
  },
  heroBtnWrap: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  heroBtnText: { ...Typography.buttonLarge, color: Colors.primaryDark },

  // Continue card
  continueCard: { marginBottom: SECTION_GAP },
  continueRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueInfo: { flex: 1, marginLeft: Spacing.base },
  continueLabel: { ...Typography.caption, color: Colors.muted, textAlign: 'right' },
  continueTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right', marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right', marginBottom: Spacing.md },
  seeAllLink: { ...Typography.small, color: Colors.primary, fontWeight: '700' },

  // Claims
  claimsLoading: { paddingVertical: Spacing.xl, alignItems: 'center' },
  claimCard: { marginBottom: Spacing.sm },
  claimRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md },
  claimEmoji: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  claimEmojiText: { fontSize: 22 },
  claimInfo: { flex: 1 },
  claimTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right' },
  claimSub: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },
  claimRight: { alignItems: 'center', gap: 4 },
  scoreSmall: { ...Typography.tiny, fontWeight: '800' },

  // Tile grid
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: SECTION_GAP },
  tile: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    minHeight: 110,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  tileIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  tileEmoji: { fontSize: 20 },
  tileTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right' },
  tileSub: { ...Typography.caption, color: Colors.muted, marginTop: 2, textAlign: 'right' },

  // Info banner
  infoBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
    marginBottom: Spacing.sm,
  },
  infoBannerText: { ...Typography.caption, color: Colors.primaryDark, textAlign: 'center' },

  disclaimer: {
    ...Typography.tiny, color: Colors.gray400,
    textAlign: 'center', lineHeight: 18, marginTop: Spacing.xs,
  },
});
