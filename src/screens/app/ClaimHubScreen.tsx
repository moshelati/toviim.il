import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim } from '../../lib/claimsService';
import { getOrCreateGraph, saveGraph } from '../../graph/storage';
import { summarizeGraph } from '../../graph/builder';
import { scoreGraph } from '../../engine/graphScoring';
import { evaluateRules } from '../../engine/rules';
import type { CaseGraph, GraphSummary } from '../../graph/types';
import type { GraphScoreResult } from '../../engine/graphScoring';
import type { RulesOutput, NextAction } from '../../engine/rules';
import type { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressRing, getScoreColor } from '../../components/ui/ProgressRing';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ClaimHub'>;

const CLAIM_TYPE_HE: Record<string, string> = {
  consumer: 'צרכנות', landlord: 'שכירות', employer: 'עבודה',
  neighbor: 'שכנים', contract: 'חוזה', other: 'אחר',
};

export function ClaimHubScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [summary, setSummary] = useState<GraphSummary | null>(null);
  const [scores, setScores] = useState<GraphScoreResult | null>(null);
  const [rules, setRules] = useState<RulesOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const c = await getClaim(claimId);
      if (!c) return;
      setClaim(c);

      const g = await getOrCreateGraph(c);
      setGraph(g);
      setSummary(summarizeGraph(g));
      setScores(scoreGraph(g));
      setRules(evaluateRules(g));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [claimId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading || !claim) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const typeLabel = CLAIM_TYPE_HE[claim.claimType ?? ''] ?? 'תביעה';

  return (
    <View style={styles.screen}>
      <AppHeader
        title={typeLabel}
        subtitle="מרכז תביעה"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Score overview */}
        {scores && (
          <Card style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <ProgressRing
                score={scores.readinessScore}
                size={80}
                strokeWidth={6}
              />
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreTitle}>מוכנות להגשה</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(scores.readinessScore) }]}>
                  {scores.readinessScore}%
                </Text>
                <Badge
                  label={scores.strengthScore === 'strong' ? '💪 חזקה' : scores.strengthScore === 'medium' ? '👍 בינונית' : '⚠️ חלשה'}
                  variant={scores.strengthScore === 'strong' ? 'success' : scores.strengthScore === 'medium' ? 'warning' : 'muted'}
                />
              </View>
            </View>

            {/* Sub-scores */}
            <View style={styles.subScores}>
              <SubScore label="כיסוי ראיות" value={scores.evidenceCoverage} />
              <SubScore label="ציר זמן" value={scores.timelineConsistency} />
              <SubScore label="שלמות משפטית" value={scores.legalCompleteness} />
            </View>
          </Card>
        )}

        {/* Blockers */}
        {rules && rules.blockers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🚫 חסימות — חובה לתקן</Text>
            {rules.blockers.map((b, i) => (
              <Card key={i} style={styles.blockerCard}>
                <View style={styles.ruleRow}>
                  <Text style={styles.ruleIcon}>{b.icon}</Text>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleTitle}>{b.title}</Text>
                    <Text style={styles.ruleDesc}>{b.description}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Warnings */}
        {rules && rules.warnings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⚠️ אזהרות — מומלץ לתקן</Text>
            {rules.warnings.map((w, i) => (
              <Card key={i} style={styles.warningCard}>
                <View style={styles.ruleRow}>
                  <Text style={styles.ruleIcon}>{w.icon}</Text>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleTitle}>{w.title}</Text>
                    <Text style={styles.ruleDesc}>{w.description}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Next actions */}
        {rules && rules.nextActions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📋 הצעדים הבאים</Text>
            {rules.nextActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleAction(action)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDesc}>{action.description}</Text>
                </View>
                <Text style={styles.actionArrow}>←</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Graph stats */}
        {summary && (
          <>
            <Text style={styles.sectionTitle}>📊 סטטיסטיקת תיק</Text>
            <View style={styles.statsGrid}>
              <StatTile emoji="📅" label="אירועים" value={summary.eventCount} />
              <StatTile emoji="💰" label="דרישות" value={summary.demandCount} />
              <StatTile emoji="📎" label="ראיות" value={summary.evidenceCount} />
              <StatTile emoji="✉️" label="תקשורת" value={summary.communicationCount} />
            </View>
          </>
        )}

        {/* Quick actions bar */}
        <View style={styles.quickActions}>
          <QuickAction
            emoji="🤖"
            label="ראיון AI"
            onPress={() => navigation.navigate('ClaimChat', { claimId, claimType: claim.claimType ?? '' })}
          />
          <QuickAction
            emoji="📄"
            label="כתב תביעה"
            onPress={() => navigation.navigate('ClaimDetail', { claimId })}
          />
          <QuickAction
            emoji="⚖️"
            label="מוק-טריאל"
            onPress={() => navigation.navigate('MockTrial', { claimId })}
          />
          <QuickAction
            emoji="📊"
            label="ניקוד מפורט"
            onPress={() => navigation.navigate('Confidence', { claimId })}
          />
        </View>
      </ScrollView>
    </View>
  );

  function handleAction(action: NextAction) {
    switch (action.screen) {
      case 'PlaintiffForm':
        navigation.navigate('PlaintiffForm', { claimId });
        break;
      case 'DefendantForm':
        navigation.navigate('DefendantForm', { claimId });
        break;
      case 'DemandForm':
        navigation.navigate('DemandForm', { claimId });
        break;
      case 'ClaimChat':
        navigation.navigate('ClaimChat', { claimId, claimType: claim?.claimType ?? '' });
        break;
      case 'EvidenceLinking':
        navigation.navigate('EvidenceLinking', { claimId });
        break;
      case 'WarningLetter':
        navigation.navigate('WarningLetter', { claimId });
        break;
      case 'ClaimDetail':
        navigation.navigate('ClaimDetail', { claimId });
        break;
      case 'MockTrial':
        navigation.navigate('MockTrial', { claimId });
        break;
      default:
        break;
    }
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SubScore({ label, value }: { label: string; value: number }) {
  const color = getScoreColor(value);
  return (
    <View style={styles.subScoreItem}>
      <View style={styles.subScoreBar}>
        <View style={[styles.subScoreFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.subScoreLabelRow}>
        <Text style={styles.subScoreLabel}>{label}</Text>
        <Text style={[styles.subScoreValue, { color }]}>{value}%</Text>
      </View>
    </View>
  );
}

function StatTile({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.quickActionEmoji}>{emoji}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { padding: SCREEN_PADDING },

  // Score card
  scoreCard: { marginBottom: SECTION_GAP },
  scoreRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  scoreInfo: { flex: 1, alignItems: 'flex-end' },
  scoreTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right' },
  scoreValue: { ...Typography.h1, fontWeight: '800', textAlign: 'right' },

  subScores: { marginTop: Spacing.xl, gap: Spacing.md },
  subScoreItem: { gap: 4 },
  subScoreBar: {
    height: 6, borderRadius: 3, backgroundColor: Colors.gray200,
    overflow: 'hidden',
  },
  subScoreFill: { height: 6, borderRadius: 3 },
  subScoreLabelRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
  },
  subScoreLabel: { ...Typography.caption, color: Colors.muted },
  subScoreValue: { ...Typography.caption, fontWeight: '700' },

  // Section
  sectionTitle: {
    ...Typography.bodyLarge, color: Colors.text, textAlign: 'right',
    marginBottom: Spacing.md, marginTop: Spacing.sm,
  },

  // Rule cards
  blockerCard: { marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#fca5a520' },
  warningCard: { marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#f59e0b20' },
  ruleRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: Spacing.md,
  },
  ruleIcon: { fontSize: 22, marginTop: 2 },
  ruleInfo: { flex: 1 },
  ruleTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  ruleDesc: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2, lineHeight: 20 },

  // Action cards
  actionCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    ...Shadows.sm,
  },
  actionIcon: { fontSize: 24 },
  actionInfo: { flex: 1 },
  actionTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  actionDesc: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },
  actionArrow: { fontSize: 18, color: Colors.primary, fontWeight: '600' },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: SECTION_GAP,
  },
  statTile: {
    flex: 1, minWidth: '22%', backgroundColor: Colors.white,
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { ...Typography.h3, color: Colors.text },
  statLabel: { ...Typography.tiny, color: Colors.muted, marginTop: 2 },

  // Quick actions
  quickActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm,
  },
  quickAction: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primaryMid + '30',
  },
  quickActionEmoji: { fontSize: 24, marginBottom: 4 },
  quickActionLabel: { ...Typography.small, fontWeight: '700', color: Colors.primaryDark },
});
