import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { checkEligibility } from '../../engine/eligibility';
import type { EligibilityInput, EligibilityResult } from '../../engine/eligibility';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS, formatNIS } from '../../config/legal';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Eligibility'>;

const CLAIM_TYPES = [
  { key: 'consumer', emoji: '🛒', label: 'צרכנות', desc: 'מוצר פגום, שירות גרוע, אי-אספקה' },
  { key: 'landlord', emoji: '🏠', label: 'שכירות', desc: 'פיקדון, נזקים בדירה, תיקונים' },
  { key: 'employer', emoji: '💼', label: 'עבודה', desc: 'שכר לא שולם, פיצויי פיטורין' },
  { key: 'neighbor', emoji: '🏘️', label: 'שכנים', desc: 'נזקי שכנים, מטרד רעש' },
  { key: 'contract', emoji: '📝', label: 'חוזה', desc: 'הפרת חוזה, נזק כספי' },
  { key: 'other',    emoji: '⚖️', label: 'אחר', desc: 'סיבה אחרת' },
];

const AMOUNT_OPTIONS = [
  { label: 'עד 5,000 ₪', value: 5000 },
  { label: '5,000–15,000 ₪', value: 15000 },
  { label: '15,000–30,000 ₪', value: 30000 },
  { label: '30,000–50,000 ₪', value: 50000 },
  { label: 'מעל 50,000 ₪', value: 80000 },
  { label: 'לא יודע/ת', value: 0 },
];

export function EligibilityScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const initialType = route.params?.claimType ?? '';

  const [step, setStep] = useState<'type' | 'amount' | 'questions' | 'result'>(
    initialType ? 'amount' : 'type'
  );
  const [claimType, setClaimType] = useState(initialType);
  const [amount, setAmount] = useState(0);
  const [isGovernment, setIsGovernment] = useState(false);
  const [isClassAction, setIsClassAction] = useState(false);
  const [isOlderThan7Years, setIsOlderThan7Years] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);

  const handleTypeSelect = (type: string) => {
    setClaimType(type);
    setStep('amount');
  };

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setStep('questions');
  };

  const handleCheck = () => {
    const input: EligibilityInput = {
      plaintiffType: 'individual',
      amount,
      claimType,
      defendantIsGovernment: isGovernment,
      isClassAction,
      yearsOld: isOlderThan7Years ? 8 : undefined,
    };
    const res = checkEligibility(input);
    setResult(res);
    setStep('result');
  };

  const handleContinue = () => {
    navigation.navigate('NewClaim');
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="בדיקת כשירות"
        subtitle="האם התביעה שלך מתאימה?"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Claim type */}
        {step === 'type' && (
          <>
            <Text style={styles.stepTitle}>על מה התביעה?</Text>
            <Text style={styles.stepSub}>בחר את הסוג הכי קרוב</Text>
            <View style={styles.typeGrid}>
              {CLAIM_TYPES.map((ct) => (
                <TouchableOpacity
                  key={ct.key}
                  style={[styles.typeCard, claimType === ct.key && styles.typeCardSelected]}
                  onPress={() => handleTypeSelect(ct.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.typeEmoji}>{ct.emoji}</Text>
                  <Text style={styles.typeLabel}>{ct.label}</Text>
                  <Text style={styles.typeDesc}>{ct.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 2: Amount */}
        {step === 'amount' && (
          <>
            <Text style={styles.stepTitle}>מה הסכום המשוער?</Text>
            <Text style={styles.stepSub}>
              גבול תביעות קטנות: עד {formatNIS(SMALL_CLAIMS_MAX_AMOUNT_NIS)}
            </Text>
            <View style={styles.amountList}>
              {AMOUNT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.amountCard, amount === opt.value && styles.amountCardSelected]}
                  onPress={() => handleAmountSelect(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.amountLabel, amount === opt.value && styles.amountLabelSelected]}>
                    {opt.label}
                  </Text>
                  {opt.value > SMALL_CLAIMS_MAX_AMOUNT_NIS && (
                    <Badge label="מעל הגבול" variant="warning" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 3: Additional questions */}
        {step === 'questions' && (
          <>
            <Text style={styles.stepTitle}>שאלות נוספות</Text>
            <Text style={styles.stepSub}>עזור לנו לבדוק כשירות</Text>

            <YesNoQuestion
              question="האם הנתבע הוא גוף ממשלתי?"
              value={isGovernment}
              onChange={setIsGovernment}
            />
            <YesNoQuestion
              question="האם מדובר בתביעה ייצוגית?"
              value={isClassAction}
              onChange={setIsClassAction}
            />
            <YesNoQuestion
              question="האם האירוע קרה לפני יותר מ-7 שנים?"
              value={isOlderThan7Years}
              onChange={setIsOlderThan7Years}
            />

            <PrimaryButton
              title="בדוק כשירות"
              icon="🔍"
              onPress={handleCheck}
              style={{ marginTop: Spacing.xl }}
            />
          </>
        )}

        {/* Step 4: Result */}
        {step === 'result' && result && (
          <>
            <Card style={[
              styles.resultCard,
              result.verdict === 'eligible' ? styles.resultGood :
              result.verdict === 'ineligible' ? styles.resultBad : styles.resultMaybe,
            ]}>
              <Text style={styles.resultEmoji}>
                {result.verdict === 'eligible' ? '✅' :
                 result.verdict === 'ineligible' ? '❌' : '⚠️'}
              </Text>
              <Text style={styles.resultTitle}>
                {result.verdict === 'eligible' ? 'כשיר להגשה' :
                 result.verdict === 'ineligible' ? 'לא כשיר' : 'ייתכן שכשיר'}
              </Text>
              <Text style={styles.resultText}>{result.verdictText}</Text>
            </Card>

            {result.blockers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🚫 מגבלות</Text>
                {result.blockers.map((b, i) => (
                  <Card key={i} style={styles.blockerCard}>
                    <Text style={styles.blockerText}>{b}</Text>
                  </Card>
                ))}
              </>
            )}

            {result.alternativeCourt && (
              <Card style={styles.altCard}>
                <Text style={styles.altTitle}>🏛️ אפשרות חלופית</Text>
                <Text style={styles.altText}>{result.alternativeCourt}</Text>
              </Card>
            )}

            <View style={styles.resultActions}>
              {result.verdict !== 'ineligible' && (
                <PrimaryButton
                  title="המשך לפתיחת תביעה"
                  icon="⚖️"
                  onPress={handleContinue}
                />
              )}
              <TouchableOpacity
                style={styles.restartBtn}
                onPress={() => {
                  setStep('type');
                  setClaimType('');
                  setAmount(0);
                  setResult(null);
                }}
              >
                <Text style={styles.restartText}>🔄 בדוק שוב</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function YesNoQuestion({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Card style={styles.questionCard}>
      <Text style={styles.questionText}>{question}</Text>
      <View style={styles.yesNoRow}>
        <TouchableOpacity
          style={[styles.yesNoBtn, value && styles.yesNoBtnActive]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.yesNoText, value && styles.yesNoTextActive]}>כן</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoBtn, !value && styles.yesNoBtnActive]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.yesNoText, !value && styles.yesNoTextActive]}>לא</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { padding: SCREEN_PADDING },

  stepTitle: {
    ...Typography.h2, color: Colors.text, textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  stepSub: {
    ...Typography.body, color: Colors.muted, textAlign: 'right',
    marginBottom: SECTION_GAP,
  },

  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'flex-end',
  },
  typeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  typeLabel: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  typeDesc: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },

  // Amount list
  amountList: { gap: Spacing.sm },
  amountCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  amountLabel: { ...Typography.bodyLarge, color: Colors.text },
  amountLabelSelected: { color: Colors.primary, fontWeight: '700' },

  // Questions
  questionCard: { marginBottom: Spacing.sm },
  questionText: { ...Typography.bodyMedium, color: Colors.text, textAlign: 'right', marginBottom: Spacing.md },
  yesNoRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  yesNoBtn: {
    flex: 1, paddingVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center',
    backgroundColor: Colors.white,
  },
  yesNoBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  yesNoText: { ...Typography.bodyMedium, color: Colors.muted },
  yesNoTextActive: { color: Colors.primary, fontWeight: '700' },

  // Result
  resultCard: {
    marginBottom: SECTION_GAP, alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  resultGood: { borderWidth: 2, borderColor: '#22c55e40' },
  resultBad: { borderWidth: 2, borderColor: '#ef444440' },
  resultMaybe: { borderWidth: 2, borderColor: '#f59e0b40' },
  resultEmoji: { fontSize: 48, marginBottom: Spacing.md },
  resultTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.sm },
  resultText: { ...Typography.body, color: Colors.muted, textAlign: 'center', lineHeight: 24 },

  sectionTitle: {
    ...Typography.bodyLarge, color: Colors.text, textAlign: 'right',
    marginBottom: Spacing.md,
  },

  blockerCard: { marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#fca5a520' },
  blockerText: { ...Typography.body, color: Colors.text, textAlign: 'right' },

  altCard: { marginBottom: SECTION_GAP },
  altTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  altText: { ...Typography.body, color: Colors.muted, textAlign: 'right' },

  resultActions: { marginTop: Spacing.md, gap: Spacing.md },
  restartBtn: { alignSelf: 'center', paddingVertical: Spacing.md },
  restartText: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
});
