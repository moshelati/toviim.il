import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
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
  consumer: '\u05E6\u05E8\u05DB\u05E0\u05D5\u05EA',
  landlord: '\u05E9\u05DB\u05D9\u05E8\u05D5\u05EA',
  employer: '\u05E2\u05D1\u05D5\u05D3\u05D4',
  neighbor: '\u05E9\u05DB\u05E0\u05D9\u05DD',
  contract: '\u05D7\u05D5\u05D6\u05D4',
  other:    '\u05D0\u05D7\u05E8',
};

const CLAIM_TYPE_EMOJI: Record<string, string> = {
  consumer: '\uD83D\uDED2',
  landlord: '\uD83C\uDFE0',
  employer: '\uD83D\uDCBC',
  neighbor: '\uD83C\uDFD8\uFE0F',
  contract: '\uD83D\uDCDD',
  other:    '\u2696\uFE0F',
};

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] ?? '';

  const loadClaims = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getUserClaims(user.uid);
      setClaims(result);
    } catch { /* silent */ }
    finally { setLoadingClaims(false); }
  }, [user]);

  // Reload claims every time the tab is focused
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '\uD83C\uDF19 \u05DC\u05D9\u05DC\u05D4 \u05D8\u05D5\u05D1';
    if (hour < 12) return '\u2600\uFE0F \u05D1\u05D5\u05E7\u05E8 \u05D8\u05D5\u05D1';
    if (hour < 17) return '\uD83C\uDF24\uFE0F \u05E6\u05D4\u05E8\u05D9\u05D9\u05DD \u05D8\u05D5\u05D1\u05D9\u05DD';
    if (hour < 21) return '\uD83C\uDF05 \u05E2\u05E8\u05D1 \u05D8\u05D5\u05D1';
    return '\uD83C\uDF19 \u05DC\u05D9\u05DC\u05D4 \u05D8\u05D5\u05D1';
  };

  // Find the most recent active claim
  const activeClaim = claims.find(c => c.status === 'chat' || c.status === 'evidence' || c.status === 'review');
  // Show max 3 recent claims as preview
  const recentClaims = claims.slice(0, 3);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>toviim.il</Text>
            <Text style={styles.headerSub}>{'\u2696\uFE0F \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA \u05D7\u05DB\u05DE\u05D5\u05EA'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
          </Text>
          <Text style={styles.greetingSub}>{'\u05DE\u05D4 \u05E0\u05E2\u05E9\u05D4 \u05D4\u05D9\u05D5\u05DD?'}</Text>
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
              <Text style={styles.heroIcon}>{'\u2696'}</Text>
            </View>
            <Text style={styles.heroTitle}>{'\u05EA\u05D1\u05D9\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4'}</Text>
            <Text style={styles.heroSub}>
              {'\u05EA\u05D5\u05DA 15 \u05D3\u05E7\u05D5\u05EA \u05EA\u05E6\u05D0/\u05D9 \u05E2\u05DD PDF + \u05E0\u05E1\u05E4\u05D7\u05D9\u05DD'}
            </Text>
            <View style={styles.heroBtnWrap}>
              <Text style={styles.heroBtnText}>{'\u05D4\u05EA\u05D7\u05DC \u05E2\u05DB\u05E9\u05D9\u05D5'}</Text>
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
                <Text style={styles.continueLabel}>{'\u05D4\u05DE\u05E9\u05DA \u05D0\u05EA \u05D4\u05EA\u05D9\u05E7'}</Text>
                <Text style={styles.continueTitle}>
                  {CLAIM_TYPE_EMOJI[activeClaim.claimType ?? ''] ?? '\u2696\uFE0F'}{' '}
                  {CLAIM_TYPE_HE[activeClaim.claimType ?? ''] ?? '\u05EA\u05D1\u05D9\u05E2\u05D4'}
                </Text>
                <Badge
                  label={activeClaim.status === 'chat' ? '\u05D1\u05E8\u05D0\u05D9\u05D5\u05DF' : '\u05D1\u05E2\u05E8\u05D9\u05DB\u05D4'}
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
              <Text style={styles.sectionTitle}>{'\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA'}</Text>
              {claims.length > 3 && (
                <TouchableOpacity onPress={() => navigation.navigate('ClaimsTab' as any)}>
                  <Text style={styles.seeAllLink}>{'\u05E8\u05D0\u05D4 \u05D4\u05DB\u05DC'} ({claims.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentClaims.map(c => {
              const score = c.readinessScore ?? 0;
              const scoreColor = getScoreColor(score);
              const typeLabel = CLAIM_TYPE_HE[c.claimType ?? ''] ?? '\u05EA\u05D1\u05D9\u05E2\u05D4';
              const typeEmoji = CLAIM_TYPE_EMOJI[c.claimType ?? ''] ?? '\u2696\uFE0F';
              const statusLabel =
                c.status === 'chat' ? '\u05D1\u05E8\u05D0\u05D9\u05D5\u05DF' :
                c.status === 'review' ? '\u05D1\u05E2\u05E8\u05D9\u05DB\u05D4' :
                c.status === 'draft' ? '\u05D8\u05D9\u05D5\u05D8\u05D4' :
                c.status === 'ready' ? '\u05DE\u05D5\u05DB\u05DF' :
                c.status === 'exported' ? '\u05D9\u05D5\u05E6\u05D0' : '\u05E4\u05EA\u05D5\u05D7';

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
                        {c.defendant || c.defendants?.[0]?.name ? ` \u05E0\u05D2\u05D3 ${c.defendant || c.defendants?.[0]?.name}` : ''}
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
        <Text style={styles.sectionTitle}>{'\u05D4\u05DB\u05DC\u05D9\u05DD \u05E9\u05DC\u05DA'}</Text>
        <View style={styles.tileGrid}>
          {[
            { emoji: '\uD83E\uDD16', title: '\u05E8\u05D0\u05D9\u05D5\u05DF AI', sub: '\u05E9\u05D0\u05DC\u05D5\u05EA \u05DE\u05E0\u05D7\u05D5\u05EA \u05DC\u05D1\u05E0\u05D9\u05D9\u05EA \u05D4\u05EA\u05D9\u05E7', onPress: () => navigation.navigate('NewClaim') },
            { emoji: '\uD83D\uDCC4', title: '\u05DB\u05EA\u05D1 \u05EA\u05D1\u05D9\u05E2\u05D4', sub: 'PDF \u05DE\u05D5\u05DB\u05DF \u05DC\u05D8\u05D5\u05E4\u05E1 1', onPress: () => navigation.navigate('NewClaim') },
            { emoji: '\u2696\uFE0F', title: '\u05DE\u05D5\u05E7-\u05D8\u05E8\u05D9\u05D0\u05DC', sub: '\u05EA\u05E8\u05D2\u05D5\u05DC \u05E2\u05DD \u05E9\u05D5\u05E4\u05D8 AI', onPress: () => navigation.navigate('NewClaim') },
            { emoji: '\uD83D\uDCD6', title: '\u05DE\u05D3\u05E8\u05D9\u05DA', sub: '\u05D0\u05D9\u05DA \u05DE\u05D2\u05D9\u05E9\u05D9\u05DD \u05EA\u05D1\u05D9\u05E2\u05D4', onPress: () => navigation.navigate('GuideTab' as any) },
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
            {'\u2139'} {'\u05D2\u05D1\u05D5\u05DC \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA: \u05E2\u05D3'} <Text style={{ fontWeight: '700' }}>{formatNIS(SMALL_CLAIMS_MAX_AMOUNT_NIS)}</Text>
          </Text>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          {'\uD83E\uDD16 \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DE\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1-AI \u05D5\u05D0\u05D9\u05E0\u05D4 \u05DE\u05D7\u05DC\u05D9\u05E4\u05D4 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  // Header (simple, no gradient since we have tabs)
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
  scrollContent: { padding: SCREEN_PADDING, paddingBottom: 24 },

  // Greeting
  greeting: { marginBottom: SECTION_GAP },
  greetingText: { ...Typography.h2, color: Colors.text, textAlign: 'right' },
  greetingSub: { ...Typography.body, color: Colors.muted, textAlign: 'right', marginTop: 4 },

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
