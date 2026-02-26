import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  TouchableOpacity, ScrollView, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { getClaim, recalculateConfidence } from '../../lib/claimsService';
import {
  getReadinessLabel, getReadinessColor,
  getStrengthLabel, getStrengthColor,
  calculateConfidence, ClaimForScoring,
  ScoreBreakdown,
} from '../../engine/confidence';
import { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { ProgressRing, getScoreColor } from '../../components/ui/ProgressRing';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PrimaryButton, SecondaryButton } from '../../components/ui/PrimaryButton';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Confidence'>;

const CLAIM_TYPE_HE: Record<string, string> = {
  consumer: '\u05E6\u05E8\u05DB\u05E0\u05D5\u05EA',
  landlord: '\u05E9\u05DB\u05D9\u05E8\u05D5\u05EA',
  employer: '\u05E2\u05D1\u05D5\u05D3\u05D4',
  neighbor: '\u05E9\u05DB\u05E0\u05D9\u05DD',
  contract: '\u05D7\u05D5\u05D6\u05D4',
  other:    '\u05D0\u05D7\u05E8',
};

const BREAKDOWN_LABELS: { key: keyof ScoreBreakdown; label: string; max: number; icon: string }[] = [
  { key: 'requiredFields', label: '\u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4',  max: 40, icon: '\u270F\uFE0F' },
  { key: 'evidence',       label: '\u05E8\u05D0\u05D9\u05D5\u05EA',          max: 15, icon: '\uD83D\uDCF7' },
  { key: 'signature',      label: '\u05D7\u05EA\u05D9\u05DE\u05D4',          max: 15, icon: '\u270D\uFE0F' },
  { key: 'validAmount',    label: '\u05E1\u05DB\u05D5\u05DD',           max: 10, icon: '\uD83D\uDCB0' },
  { key: 'demands',        label: '\u05E1\u05E2\u05D3\u05D9\u05DD',          max: 10, icon: '\uD83D\uDCCB' },
  { key: 'timeline',       label: '\u05E6\u05D9\u05E8 \u05D6\u05DE\u05DF',       max: 10, icon: '\uD83D\uDCC5' },
];

function getBreakdownColor(value: number, max: number): string {
  const pct = (value / max) * 100;
  if (pct >= 80) return Colors.success;
  if (pct >= 50) return Colors.warning;
  if (pct > 0) return '#F97316';
  return Colors.gray300;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high':   return Colors.danger;
    case 'medium': return Colors.warning;
    case 'low':    return Colors.primaryMid;
    default:       return Colors.gray400;
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':   return Colors.danger;
    case 'medium': return Colors.warning;
    case 'low':    return Colors.primary;
    default:       return Colors.gray400;
  }
}

export function ConfidenceScreen({ route, navigation }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  function buildScoring(c: Claim): ClaimForScoring {
    return {
      plaintiffName: c.plaintiffName || c.plaintiff?.fullName,
      plaintiffId: c.plaintiffId || c.plaintiff?.idNumber,
      plaintiffPhone: c.plaintiffPhone || c.plaintiff?.phone,
      plaintiffAddress: c.plaintiffAddress || c.plaintiff?.address,
      defendant: c.defendant || c.defendants?.[0]?.name,
      defendantAddress: c.defendantAddress || c.defendants?.[0]?.address,
      amount: c.amount || c.amountClaimedNis,
      summary: c.summary,
      factsSummary: c.factsSummary,
      claimType: c.claimType,
      timeline: c.timeline,
      demands: c.demands,
      evidenceCount: c.evidence?.length ?? 0,
      hasSignature: !!(c.signatureUrl || c.signatureUri),
      hasWrittenAgreement: c.hasWrittenAgreement,
      hasPriorNotice: c.hasPriorNotice,
      hasProofOfPayment: c.hasProofOfPayment,
      incidentDate: c.incidentDate,
    };
  }

  async function loadClaim() {
    const c = await getClaim(claimId);
    setClaim(c);
    if (c) {
      const result = calculateConfidence(buildScoring(c));
      setBreakdown(result.breakdown);
    }
    setLoading(false);
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => { loadClaim(); }, [claimId]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await recalculateConfidence(claimId);
      await loadClaim();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title={'\u05E6\u05D9\u05D5\u05DF \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA'}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{'\u05DE\u05D7\u05E9\u05D1 \u05E6\u05D9\u05D5\u05DF...'}</Text>
        </View>
      </View>
    );
  }

  const readinessScore = claim?.readinessScore ?? 0;
  const strengthScore = claim?.strengthScore ?? 'weak';
  const riskFlags = claim?.riskFlags ?? [];
  const missingFields = claim?.missingFields ?? [];
  const suggestions = claim?.suggestions ?? [];
  const readinessColor = getReadinessColor(readinessScore);

  const requiredMissing = missingFields.filter(m => m.importance === 'required');
  const recommendedMissing = missingFields.filter(m => m.importance === 'recommended');
  const highRisks = riskFlags.filter(f => f.severity === 'high');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title={'\u05E6\u05D9\u05D5\u05DF \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA'}
        subtitle={claim?.claimType ? (CLAIM_TYPE_HE[claim.claimType] ?? claim.claimType) : undefined}
        onBack={() => navigation.goBack()}
        rightIcon={
          refreshing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={{ fontSize: 18 }}>{'\uD83D\uDD04'}</Text>
          )
        }
        onRight={handleRefresh}
      />

      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Main Score Card ─────────────────────────────── */}
        <Card style={styles.mainScoreCard}>
          <Text style={styles.mainScoreLabel}>{'\u05E6\u05D9\u05D5\u05DF \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4'}</Text>
          <View style={styles.mainScoreCenter}>
            <ProgressRing score={readinessScore} size={140} strokeWidth={8} />
          </View>

          {/* Progress bar */}
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${Math.min(readinessScore, 100)}%`, backgroundColor: readinessColor }]} />
          </View>
          <Text style={[styles.mainScoreStatus, { color: readinessColor }]}>
            {getReadinessLabel(readinessScore)}
          </Text>

          {/* Quick summary */}
          {highRisks.length > 0 && (
            <View style={styles.alertBanner}>
              <Text style={styles.alertText}>
                {'\u26A0\uFE0F'} {highRisks.length} {'\u05D3\u05D2\u05DC\u05D9 \u05E1\u05D9\u05DB\u05D5\u05DF \u05D2\u05D1\u05D5\u05D4\u05D9\u05DD'}
                {requiredMissing.length > 0 ? ` \u00B7 ${requiredMissing.length} \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4` : ''}
              </Text>
            </View>
          )}
        </Card>

        {/* ─── Score Breakdown ─────────────────────────────── */}
        {breakdown && (
          <Card style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>{'\uD83D\uDCCA \u05E4\u05D9\u05E8\u05D5\u05D8 \u05E6\u05D9\u05D5\u05DF'}</Text>
            {BREAKDOWN_LABELS.map(item => {
              const val = breakdown[item.key];
              const pct = Math.round((val / item.max) * 100);
              const color = getBreakdownColor(val, item.max);
              return (
                <View key={item.key} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Text style={styles.breakdownIcon}>{item.icon}</Text>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={[styles.breakdownValue, { color }]}>
                      {val}/{item.max}
                    </Text>
                  </View>
                  <View style={styles.breakdownBarBg}>
                    <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* ─── Strength Card ──────────────────────────────── */}
        <Card style={styles.strengthCard}>
          <View style={styles.strengthHeader}>
            <Text style={styles.strengthTitle}>{'\u2696\uFE0F \u05E2\u05D5\u05E6\u05DE\u05EA \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4'}</Text>
            <Badge
              label={getStrengthLabel(strengthScore)}
              variant={strengthScore === 'strong' ? 'success' : strengthScore === 'medium' ? 'warning' : 'danger'}
            />
          </View>
          <Text style={styles.strengthDesc}>
            {strengthScore === 'strong'
              ? '\u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05E9\u05DC\u05DA \u05E0\u05E8\u05D0\u05D9\u05EA \u05D7\u05D6\u05E7\u05D4 \u05E2\u05DD \u05E8\u05D0\u05D9\u05D5\u05EA \u05EA\u05D5\u05DE\u05DB\u05D5\u05EA \u05D5\u05EA\u05D9\u05E2\u05D5\u05D3 \u05DE\u05E1\u05E4\u05E7.'
              : strengthScore === 'medium'
                ? '\u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05D1\u05D9\u05E0\u05D5\u05E0\u05D9\u05EA. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D7\u05D6\u05E7 \u05D0\u05D5\u05EA\u05D4 \u05E2\u05DD \u05E8\u05D0\u05D9\u05D5\u05EA \u05D5\u05EA\u05D9\u05E2\u05D5\u05D3 \u05E0\u05D5\u05E1\u05E4\u05D9\u05DD.'
                : '\u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05D3\u05D5\u05E8\u05E9\u05EA \u05D7\u05D9\u05D6\u05D5\u05E7. \u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D0\u05E1\u05D5\u05E3 \u05E8\u05D0\u05D9\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D5\u05EA \u05D5\u05DC\u05D4\u05E9\u05DC\u05D9\u05DD \u05E4\u05E8\u05D8\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9\u05DD.'
            }
          </Text>
        </Card>

        {/* ─── Stats Row ──────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{claim?.evidence?.length ?? 0}</Text>
            <Text style={styles.statLabel}>{'\u05E8\u05D0\u05D9\u05D5\u05EA'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{claim?.timeline?.length ?? 0}</Text>
            <Text style={styles.statLabel}>{'\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{claim?.demands?.length ?? 0}</Text>
            <Text style={styles.statLabel}>{'\u05E1\u05E2\u05D3\u05D9\u05DD'}</Text>
          </View>
        </View>

        {/* ─── Missing Fields ─────────────────────────────── */}
        {missingFields.length > 0 && (
          <Card style={styles.missingCard}>
            <Text style={styles.sectionTitle}>
              {'\u274C \u05E9\u05D3\u05D5\u05EA \u05D7\u05E1\u05E8\u05D9\u05DD'} ({missingFields.length})
            </Text>

            {requiredMissing.length > 0 && (
              <>
                <Text style={styles.subSectionLabel}>{'\u05D7\u05D5\u05D1\u05D4'}</Text>
                {requiredMissing.map((field, i) => (
                  <View key={i} style={styles.fieldRow}>
                    <View style={[styles.fieldDot, { backgroundColor: Colors.danger }]} />
                    <Text style={styles.fieldText}>{field.label}</Text>
                  </View>
                ))}
              </>
            )}

            {recommendedMissing.length > 0 && (
              <>
                <Text style={styles.subSectionLabel}>{'\u05DE\u05D5\u05DE\u05DC\u05E5'}</Text>
                {recommendedMissing.map((field, i) => (
                  <View key={i} style={styles.fieldRow}>
                    <View style={[styles.fieldDot, { backgroundColor: Colors.warning }]} />
                    <Text style={styles.fieldText}>{field.label}</Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        )}

        {/* ─── Risk Flags ─────────────────────────────────── */}
        {riskFlags.length > 0 && (
          <Card style={styles.riskCard}>
            <Text style={styles.sectionTitle}>
              {'\u26A0\uFE0F \u05D3\u05D2\u05DC\u05D9 \u05E1\u05D9\u05DB\u05D5\u05DF'} ({riskFlags.length})
            </Text>
            {riskFlags.map((flag, i) => (
              <View key={flag.id ?? i} style={[styles.riskRow, i === riskFlags.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                <View style={styles.riskHeader}>
                  <Text style={styles.riskIcon}>{flag.icon}</Text>
                  <Text style={styles.riskTitle}>{flag.title}</Text>
                  <View style={[styles.severityDot, { backgroundColor: getSeverityColor(flag.severity) }]} />
                </View>
                <Text style={styles.riskDesc}>{flag.description}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ─── Suggestions ────────────────────────────────── */}
        {suggestions.length > 0 && (
          <Card style={styles.suggestCard}>
            <Text style={styles.sectionTitle}>
              {'\uD83D\uDCA1 \u05D4\u05DE\u05DC\u05E6\u05D5\u05EA \u05DC\u05E9\u05D9\u05E4\u05D5\u05E8'}
            </Text>
            {suggestions.map((sug, i) => (
              <TouchableOpacity
                key={sug.id ?? i}
                style={[styles.suggestRow, i === suggestions.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}
                onPress={() => {
                  if (sug.id === 'add_evidence' || sug.id === 'more_evidence' || sug.id === 'add_signature') {
                    navigation.navigate('ClaimDetail', { claimId });
                  } else if (sug.id === 'complete_required_fields') {
                    navigation.navigate('ClaimChat', { claimId, claimType: claim?.claimType ?? '' });
                  } else if (sug.id === 'mock_trial') {
                    navigation.navigate('MockTrial', { claimId });
                  } else {
                    navigation.navigate('ClaimDetail', { claimId });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.suggestHeader}>
                  <View style={[styles.suggestIconWrap, { backgroundColor: getPriorityColor(sug.priority) + '15' }]}>
                    <Text style={styles.suggestIcon}>{sug.icon}</Text>
                  </View>
                  <View style={styles.suggestContent}>
                    <Text style={styles.suggestTitle}>{sug.title}</Text>
                    <Text style={styles.suggestDesc}>{sug.description}</Text>
                  </View>
                  <Text style={styles.suggestArrow}>{'\u2190'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* ─── All Good ───────────────────────────────────── */}
        {missingFields.length === 0 && riskFlags.length === 0 && readinessScore >= 70 && (
          <View style={styles.allGoodCard}>
            <Text style={styles.allGoodIcon}>{'\uD83C\uDF89'}</Text>
            <Text style={styles.allGoodTitle}>{'\u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05DE\u05D5\u05DB\u05E0\u05D4!'}</Text>
            <Text style={styles.allGoodSub}>
              {'\u05DB\u05DC \u05D4\u05E4\u05E8\u05D8\u05D9\u05DD \u05D4\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05D4\u05D5\u05E9\u05DC\u05DE\u05D5. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05DC\u05D9\u05E6\u05D9\u05E8\u05EA \u05DB\u05EA\u05D1 \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4.'}
            </Text>
          </View>
        )}

        {/* ─── Action Buttons ─────────────────────────────── */}
        <View style={styles.actionsSection}>
          <PrimaryButton
            title={'\uD83D\uDCC4  \u05E6\u05E4\u05D4 \u05D1\u05DB\u05EA\u05D1 \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4'}
            onPress={() => navigation.navigate('ClaimDetail', { claimId })}
          />
          <SecondaryButton
            title={'\u2696\uFE0F  \u05EA\u05E8\u05D2\u05DC \u05DE\u05D5\u05E7-\u05D8\u05E8\u05D9\u05D0\u05DC'}
            onPress={() => navigation.navigate('MockTrial', { claimId })}
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.small, color: Colors.muted, marginTop: Spacing.md },
  scroll: { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING },

  // Main Score Card
  mainScoreCard: { marginBottom: Spacing.md, alignItems: 'center' as const },
  mainScoreLabel: {
    ...Typography.small, fontWeight: '600', color: Colors.muted, marginBottom: Spacing.md,
  },
  mainScoreCenter: { marginBottom: Spacing.md },
  barBg: {
    width: '100%', height: 10, backgroundColor: Colors.gray200,
    borderRadius: 5, overflow: 'hidden', marginBottom: Spacing.sm,
  },
  barFill: { height: '100%', borderRadius: 5 },
  mainScoreStatus: { ...Typography.bodyLarge, fontWeight: '800' },
  alertBanner: {
    backgroundColor: Colors.dangerLight, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginTop: Spacing.md, width: '100%',
  },
  alertText: { ...Typography.caption, color: Colors.danger, textAlign: 'center', fontWeight: '600' },

  // Breakdown
  breakdownCard: { marginBottom: Spacing.md },
  breakdownRow: { marginBottom: Spacing.md },
  breakdownLabelRow: {
    flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4, gap: Spacing.xs,
  },
  breakdownIcon: { fontSize: 14 },
  breakdownLabel: { ...Typography.caption, color: Colors.text, flex: 1, textAlign: 'right' },
  breakdownValue: { ...Typography.caption, fontWeight: '700' },
  breakdownBarBg: {
    height: 6, backgroundColor: Colors.gray200, borderRadius: 3, overflow: 'hidden',
  },
  breakdownBarFill: { height: '100%', borderRadius: 3 },

  // Section title
  sectionTitle: {
    ...Typography.bodyLarge, color: Colors.text, textAlign: 'right', marginBottom: Spacing.md,
  },

  // Strength
  strengthCard: { marginBottom: Spacing.md },
  strengthHeader: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.sm,
  },
  strengthTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text },
  strengthDesc: {
    ...Typography.caption, color: Colors.gray600, textAlign: 'right', lineHeight: 22,
  },

  // Stats
  statsRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: Spacing.base, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  statValue: { ...Typography.h2, color: Colors.primary, marginBottom: 2 },
  statLabel: { ...Typography.tiny, fontWeight: '600', color: Colors.muted },

  // Missing fields
  missingCard: {
    marginBottom: Spacing.md, borderColor: Colors.dangerLight, backgroundColor: '#FFF5F5',
  },
  subSectionLabel: {
    ...Typography.caption, fontWeight: '700', color: Colors.gray600,
    textAlign: 'right', marginBottom: Spacing.xs, marginTop: Spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.xs, paddingRight: Spacing.xs,
  },
  fieldDot: { width: 8, height: 8, borderRadius: 4 },
  fieldText: { flex: 1, ...Typography.small, color: Colors.gray700, textAlign: 'right' },

  // Risk flags
  riskCard: {
    marginBottom: Spacing.md, borderColor: Colors.warningLight, backgroundColor: '#FFFBEB',
  },
  riskRow: {
    marginBottom: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.warningLight,
  },
  riskHeader: {
    flexDirection: 'row-reverse', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.xs,
  },
  riskIcon: { fontSize: 18 },
  riskTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text, flex: 1, textAlign: 'right' },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  riskDesc: {
    ...Typography.caption, color: Colors.gray600, textAlign: 'right',
    lineHeight: 22, paddingRight: Spacing.xl + Spacing.sm,
  },

  // Suggestions
  suggestCard: {
    marginBottom: Spacing.md, borderColor: Colors.primaryLight, backgroundColor: '#FAF5FF',
  },
  suggestRow: {
    marginBottom: Spacing.sm, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  suggestHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
  },
  suggestIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestIcon: { fontSize: 18 },
  suggestContent: { flex: 1 },
  suggestTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  suggestDesc: { ...Typography.caption, color: Colors.gray600, textAlign: 'right', marginTop: 2, lineHeight: 20 },
  suggestArrow: { fontSize: 16, color: Colors.gray300 },

  // All good
  allGoodCard: {
    backgroundColor: Colors.successLight, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  allGoodIcon: { fontSize: 48, marginBottom: Spacing.sm },
  allGoodTitle: { ...Typography.h3, fontWeight: '800', color: '#166534', marginBottom: Spacing.xs },
  allGoodSub: { ...Typography.small, color: '#15803d', textAlign: 'center', lineHeight: 22 },

  // Actions
  actionsSection: { marginTop: Spacing.sm },
});
