import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim } from '../../lib/claimsService';
import { getOrCreateGraph } from '../../graph/storage';
import { summarizeGraph } from '../../graph/builder';
import { scoreGraph } from '../../engine/graphScoring';
import { evaluateRules } from '../../engine/rules';
import { checkEligibility } from '../../engine/eligibility';
import { getPlaintiff, getDefendants, getTotalAmount } from '../../graph/queries';
import type { CaseGraph } from '../../graph/types';
import type { Claim } from '../../types/claim';
import type { GraphScoreResult } from '../../engine/graphScoring';
import type { RulesOutput } from '../../engine/rules';
import type { EligibilityResult } from '../../engine/eligibility';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton, SecondaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressRing, getScoreColor } from '../../components/ui/ProgressRing';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Preflight'>;

interface CheckItem {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail?: string;
}

export function PreflightScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [scores, setScores] = useState<GraphScoreResult | null>(null);
  const [rules, setRules] = useState<RulesOutput | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const c = await getClaim(claimId);
      if (!c) return;
      setClaim(c);

      const g = await getOrCreateGraph(c);
      setGraph(g);
      setScores(scoreGraph(g));
      setRules(evaluateRules(g));

      const plaintiff = getPlaintiff(g);
      const totalAmount = getTotalAmount(g);
      setEligibility(checkEligibility({
        plaintiffType: plaintiff?.data.type === 'company' ? 'company' : 'individual',
        amount: totalAmount,
        claimType: c.claimType,
      }));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [claimId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading || !claim) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Build checklist
  const checks: CheckItem[] = [];

  // Plaintiff check
  const plaintiff = graph ? getPlaintiff(graph) : null;
  checks.push({
    id: 'plaintiff',
    label: 'פרטי תובע',
    status: plaintiff?.data.fullName && plaintiff?.data.idNumber ? 'pass' : 'fail',
    detail: plaintiff?.data.fullName
      ? `${plaintiff.data.fullName} (${plaintiff.data.idNumber || 'חסר ת.ז'})`
      : 'חסרים פרטי תובע',
  });

  // Defendant check
  const defendants = graph ? getDefendants(graph) : [];
  checks.push({
    id: 'defendant',
    label: 'פרטי נתבע',
    status: defendants.length > 0 && defendants[0].data.fullName ? 'pass' : 'fail',
    detail: defendants.length > 0
      ? `${defendants.length} נתבעים`
      : 'לא הוזן נתבע',
  });

  // Amount check
  const totalAmount = graph ? getTotalAmount(graph) : 0;
  checks.push({
    id: 'amount',
    label: 'סכום תביעה',
    status: totalAmount > 0 ? 'pass' : 'fail',
    detail: totalAmount > 0
      ? `${totalAmount.toLocaleString('he-IL')} ₪`
      : 'לא הוגדר סכום',
  });

  // Facts summary check
  checks.push({
    id: 'facts',
    label: 'סיכום עובדתי',
    status: claim.factsSummary && claim.factsSummary.length > 20 ? 'pass' : 'fail',
    detail: claim.factsSummary ? `${claim.factsSummary.length} תווים` : 'חסר סיכום',
  });

  // Eligibility check
  if (eligibility) {
    checks.push({
      id: 'eligibility',
      label: 'כשירות להגשה',
      status: eligibility.verdict === 'eligible' ? 'pass' :
              eligibility.verdict === 'ineligible' ? 'fail' : 'warning',
      detail: eligibility.verdictText,
    });
  }

  // Evidence check
  checks.push({
    id: 'evidence',
    label: 'ראיות',
    status: scores && scores.evidenceCoverage > 50 ? 'pass' :
            scores && scores.evidenceCoverage > 20 ? 'warning' : 'fail',
    detail: scores ? `כיסוי ראיות: ${scores.evidenceCoverage}%` : 'אין נתונים',
  });

  // Blockers check
  if (rules) {
    checks.push({
      id: 'blockers',
      label: 'חסימות',
      status: rules.blockers.length === 0 ? 'pass' : 'fail',
      detail: rules.blockers.length === 0
        ? 'אין חסימות'
        : `${rules.blockers.length} חסימות שיש לתקן`,
    });
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const allPassed = checks.every(c => c.status === 'pass');

  return (
    <View style={styles.screen}>
      <AppHeader
        title="בדיקה לפני הגשה"
        subtitle="צ׳קליסט מוכנות"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
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
                <Text style={styles.scoreDetail}>
                  {passCount}/{checks.length} בדיקות עברו
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Checklist */}
        <Text style={styles.sectionTitle}>📋 צ׳קליסט</Text>
        {checks.map((check) => (
          <Card key={check.id} style={styles.checkCard}>
            <View style={styles.checkRow}>
              <Text style={styles.checkIcon}>
                {check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'}
              </Text>
              <View style={styles.checkInfo}>
                <Text style={styles.checkLabel}>{check.label}</Text>
                {check.detail && (
                  <Text style={styles.checkDetail}>{check.detail}</Text>
                )}
              </View>
              <Badge
                label={check.status === 'pass' ? 'תקין' : check.status === 'fail' ? 'חסר' : 'אזהרה'}
                variant={check.status === 'pass' ? 'success' : check.status === 'fail' ? 'muted' : 'warning'}
              />
            </View>
          </Card>
        ))}

        {/* Blockers detail */}
        {rules && rules.blockers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🚫 חסימות שיש לתקן</Text>
            {rules.blockers.map((b, i) => (
              <Card key={i} style={styles.blockerCard}>
                <Text style={styles.blockerIcon}>{b.icon}</Text>
                <Text style={styles.blockerTitle}>{b.title}</Text>
                <Text style={styles.blockerDesc}>{b.description}</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Footer actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.base }]}>
        {allPassed ? (
          <PrimaryButton
            title="הפק כתב תביעה"
            icon="📄"
            onPress={() => navigation.navigate('ClaimDetail', { claimId })}
          />
        ) : (
          <>
            <SecondaryButton
              title="חזור לתיקון"
              icon="🔧"
              onPress={() => navigation.navigate('ClaimHub', { claimId })}
            />
            <PrimaryButton
              title="הפק בכל זאת"
              icon="📄"
              onPress={() => navigation.navigate('ClaimDetail', { claimId })}
              style={{ marginTop: Spacing.sm }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { padding: SCREEN_PADDING },

  scoreCard: { marginBottom: SECTION_GAP },
  scoreRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.xl,
  },
  scoreInfo: { flex: 1, alignItems: 'flex-end' },
  scoreTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right' },
  scoreValue: { ...Typography.h1, fontWeight: '800', textAlign: 'right' },
  scoreDetail: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },

  sectionTitle: {
    ...Typography.bodyLarge, color: Colors.text, textAlign: 'right',
    marginBottom: Spacing.md, marginTop: Spacing.sm,
  },

  checkCard: { marginBottom: Spacing.sm },
  checkRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
  },
  checkIcon: { fontSize: 20 },
  checkInfo: { flex: 1 },
  checkLabel: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  checkDetail: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },

  blockerCard: { marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#fca5a520' },
  blockerIcon: { fontSize: 22, textAlign: 'right' },
  blockerTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text, textAlign: 'right', marginTop: 4 },
  blockerDesc: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2, lineHeight: 20 },

  footer: {
    padding: SCREEN_PADDING,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
});
