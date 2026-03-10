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
import { getOrCreateGraph } from '../../graph/storage';
import { scoreGraph } from '../../engine/graphScoring';
import type { GraphScoreResult, GraphScoreBreakdown } from '../../engine/graphScoring';
import type { CaseGraph } from '../../graph/types';
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
  consumer: 'צרכנות',
  landlord: 'שכירות',
  employer: 'עבודה',
  neighbor: 'שכנים',
  contract: 'חוזה',
  other:    'אחר',
};

const BREAKDOWN_LABELS: { key: keyof ScoreBreakdown; label: string; max: number; icon: string }[] = [
  { key: 'requiredFields', label: 'שדות חובה',  max: 40, icon: '✏️' },
  { key: 'evidence',       label: 'ראיות',          max: 15, icon: '📷' },
  { key: 'signature',      label: 'חתימה',          max: 15, icon: '✍️' },
  { key: 'validAmount',    label: 'סכום',           max: 10, icon: '💰' },
  { key: 'demands',        label: 'סעדים',          max: 10, icon: '📋' },
  { key: 'timeline',       label: 'ציר זמן',       max: 10, icon: '📅' },
];

// Graph-based breakdown labels
const GRAPH_BREAKDOWN_LABELS: { key: keyof GraphScoreBreakdown; label: string; max: number; icon: string }[] = [
  { key: 'plaintiffData',  label: 'פרטי תובע',     max: 20, icon: '👤' },
  { key: 'defendantData',  label: 'פרטי נתבע',     max: 10, icon: '🏢' },
  { key: 'claimSubstance', label: 'סכום ודרישות',  max: 15, icon: '💰' },
  { key: 'narrative',      label: 'ציר זמן',       max: 15, icon: '📅' },
  { key: 'evidenceScore',  label: 'ראיות',          max: 20, icon: '📷' },
  { key: 'procedural',     label: 'הליך',           max: 10, icon: '✉️' },
  { key: 'legalBasis',     label: 'בסיס משפטי',    max: 10, icon: '⚖️' },
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
  const [graphScores, setGraphScores] = useState<GraphScoreResult | null>(null);
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

      // Also load graph-based scores
      try {
        const { getOrCreateGraph } = await import('../../graph/storage');
        const graph = await getOrCreateGraph(c);
        const gScores = scoreGraph(graph);
        setGraphScores(gScores);
      } catch {
        // Fallback — graph not available yet
      }
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
          title="ציון מוכנות"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>מחשב ציון...</Text>
        </View>
      </View>
    );
  }

  // Use graph-based score if available, otherwise fall back to flat score
  const readinessScore = graphScores?.readinessScore ?? claim?.readinessScore ?? 0;
  const strengthScore = graphScores?.strengthScore ?? claim?.strengthScore ?? 'weak';
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
        title="ציון מוכנות"
        subtitle={claim?.claimType ? (CLAIM_TYPE_HE[claim.claimType] ?? claim.claimType) : undefined}
        onBack={() => navigation.goBack()}
        rightIcon={
          refreshing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={{ fontSize: 18 }}>🔄</Text>
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
          <Text style={styles.mainScoreLabel}>ציון מוכנות התביעה</Text>
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
                ⚠️ {highRisks.length} דגלי סיכון גבוהים
                {requiredMissing.length > 0 ? ` · ${requiredMissing.length} שדות חובה` : ''}
              </Text>
            </View>
          )}
        </Card>

        {/* ─── Graph-Based Score Breakdown (preferred) ────────── */}
        {graphScores && (
          <Card style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>📊 פירוט ציון (גרף)</Text>
            {GRAPH_BREAKDOWN_LABELS.map(item => {
              const val = graphScores.breakdown[item.key];
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

            {/* Sub-scores */}
            <View style={styles.subScoresRow}>
              <View style={styles.subScoreChip}>
                <Text style={styles.subScoreValue}>{graphScores.evidenceCoverage}%</Text>
                <Text style={styles.subScoreLabel}>כיסוי ראיות</Text>
              </View>
              <View style={styles.subScoreChip}>
                <Text style={styles.subScoreValue}>{graphScores.timelineConsistency}%</Text>
                <Text style={styles.subScoreLabel}>עקביות ציר זמן</Text>
              </View>
              <View style={styles.subScoreChip}>
                <Text style={styles.subScoreValue}>{graphScores.legalCompleteness}%</Text>
                <Text style={styles.subScoreLabel}>שלמות משפטית</Text>
              </View>
            </View>
          </Card>
        )}

        {/* ─── Legacy Score Breakdown (fallback) ────────────── */}
        {!graphScores && breakdown && (
          <Card style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>📊 פירוט ציון</Text>
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
            <Text style={styles.strengthTitle}>⚖️ עוצמת התביעה</Text>
            <Badge
              label={getStrengthLabel(strengthScore)}
              variant={strengthScore === 'strong' ? 'success' : strengthScore === 'medium' ? 'warning' : 'danger'}
            />
          </View>
          <Text style={styles.strengthDesc}>
            {strengthScore === 'strong'
              ? 'התביעה שלך נראית חזקה עם ראיות תומכות ותיעוד מספק.'
              : strengthScore === 'medium'
                ? 'התביעה בינונית. ניתן לחזק אותה עם ראיות ותיעוד נוספים.'
                : 'התביעה דורשת חיזוק. מומלץ לאסוף ראיות נוספות ולהשלים פרטים חסרים.'
            }
          </Text>
        </Card>

        {/* ─── Stats Row ──────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{claim?.evidence?.length ?? 0}</Text>
            <Text style={styles.statLabel}>ראיות</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{claim?.timeline?.length ?? 0}</Text>
            <Text style={styles.statLabel}>אירועים</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{claim?.demands?.length ?? 0}</Text>
            <Text style={styles.statLabel}>סעדים</Text>
          </View>
        </View>

        {/* ─── Missing Fields ─────────────────────────────── */}
        {missingFields.length > 0 && (
          <Card style={styles.missingCard}>
            <Text style={styles.sectionTitle}>
              ❌ שדות חסרים ({missingFields.length})
            </Text>

            {requiredMissing.length > 0 && (
              <>
                <Text style={styles.subSectionLabel}>חובה</Text>
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
                <Text style={styles.subSectionLabel}>מומלץ</Text>
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
              ⚠️ דגלי סיכון ({riskFlags.length})
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
              💡 המלצות לשיפור
            </Text>
            {suggestions.map((sug, i) => (
              <TouchableOpacity
                key={sug.id ?? i}
                style={[styles.suggestRow, i === suggestions.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}
                onPress={() => {
                  if (sug.id === 'add_evidence' || sug.id === 'more_evidence' || sug.id === 'add_signature') {
                    navigation.navigate('ClaimHub', { claimId });
                  } else if (sug.id === 'complete_required_fields') {
                    navigation.navigate('ClaimHub', { claimId });
                  } else if (sug.id === 'mock_trial') {
                    navigation.navigate('MockTrial', { claimId });
                  } else if (sug.id === 'send_notice') {
                    navigation.navigate('WarningLetter', { claimId });
                  } else {
                    navigation.navigate('ClaimHub', { claimId });
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
                  <Text style={styles.suggestArrow}>←</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* ─── All Good ───────────────────────────────────── */}
        {missingFields.length === 0 && riskFlags.length === 0 && readinessScore >= 70 && (
          <View style={styles.allGoodCard}>
            <Text style={styles.allGoodIcon}>🎉</Text>
            <Text style={styles.allGoodTitle}>התביעה מוכנה!</Text>
            <Text style={styles.allGoodSub}>
              כל הפרטים הנדרשים הושלמו. ניתן להמשיך ליצירת כתב התביעה.
            </Text>
          </View>
        )}

        {/* ─── Action Buttons ─────────────────────────────── */}
        <View style={styles.actionsSection}>
          <PrimaryButton
            title="📄  המשך למרכז התביעה"
            onPress={() => navigation.navigate('ClaimHub', { claimId })}
          />
          <SecondaryButton
            title="⚖️  תרגל מוק-טריאל"
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

  // Sub-scores row
  subScoresRow: {
    flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md,
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  subScoreChip: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.gray50,
    borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  subScoreValue: { ...Typography.bodyLarge, fontWeight: '800', color: Colors.primary },
  subScoreLabel: { ...Typography.tiny, color: Colors.muted, marginTop: 2, textAlign: 'center' },

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
