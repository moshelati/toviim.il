import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AppHeader } from '../../components/ui/AppHeader';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useAuth } from '../../context/AuthContext';
import { createClaim } from '../../lib/claimsService';
import { CLAIM_CATEGORIES, SMALL_CLAIMS_MAX_AMOUNT_NIS, formatNIS } from '../../config/legal';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewClaim'>;

export function NewClaimScreen({ navigation }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [step,           setStep]           = useState<1 | 2>(1);
  const [selectedType,   setSelectedType]   = useState('');
  const [plaintiffName,  setPlaintiffName]  = useState(user?.displayName ?? '');
  const [plaintiffId,    setPlaintiffId]    = useState('');
  const [plaintiffPhone, setPlaintiffPhone] = useState('');
  const [loading,        setLoading]        = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [errorSheet,     setErrorSheet]     = useState(false);

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!plaintiffName.trim())  e.name  = 'נא להזין שם מלא';
    if (plaintiffId.length !== 9 || !/^\d+$/.test(plaintiffId))
      e.id = 'מספר ת.ז. חייב להיות 9 ספרות';
    if (plaintiffPhone.length < 9) e.phone = 'מספר טלפון לא תקין';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleStart() {
    if (!validateStep2()) return;
    if (!user) return;
    setLoading(true);
    try {
      const claimId = await createClaim(user.uid, plaintiffName.trim(), selectedType);
      const { updateClaimMeta } = await import('../../lib/claimsService');
      await updateClaimMeta(claimId, {
        plaintiffId: plaintiffId.trim(),
        plaintiffPhone: plaintiffPhone.trim(),
        plaintiff: {
          fullName: plaintiffName.trim(),
          idNumber: plaintiffId.trim(),
          phone: plaintiffPhone.trim(),
          type: 'individual',
        },
      });
      navigation.replace('ClaimChat', { claimId, claimType: selectedType });
    } catch {
      setErrorSheet(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title={step === 1 ? 'סוג התביעה' : 'הפרטים שלך'}
        onBack={() => step === 2 ? setStep(1) : navigation.goBack()}
        rightIcon={
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>{step}/2</Text>
          </View>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <>
              <Text style={styles.sectionTitle}>על מה התביעה?</Text>
              <Text style={styles.sectionSub}>
                בחר/י קטגוריה — ה-AI ידע לשאול את השאלות הנכונות
              </Text>
              <View style={styles.typeGrid}>
                {CLAIM_CATEGORIES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, selectedType === t.id && styles.typeCardSelected]}
                    onPress={() => setSelectedType(t.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.typeIcon}>{t.emoji}</Text>
                    <Text style={[styles.typeLabel, selectedType === t.id && styles.typeLabelSelected]}>
                      {t.label}
                    </Text>
                    <Text style={[styles.typeSub, selectedType === t.id && styles.typeSubSelected]}>
                      {t.sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.limitNote}>
                <Text style={styles.limitNoteText}>
                  {'ℹ️ תביעות קטנות: עד '}{formatNIS(SMALL_CLAIMS_MAX_AMOUNT_NIS)}
                </Text>
              </View>

              <Button
                label={'המשך ←'}
                onPress={() => { if (selectedType) setStep(2); }}
                size="lg"
                disabled={!selectedType}
                style={{ marginTop: Spacing.md }}
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>הפרטים שלך</Text>
              <Text style={styles.sectionSub}>
                הפרטים יופיעו בכתב התביעה הרשמי
              </Text>

              <View style={styles.formCard}>
                <Input
                  label="שם מלא (כפי שמופיע בת.ז.)"
                  placeholder="ישראל ישראלי"
                  value={plaintiffName}
                  onChangeText={setPlaintiffName}
                  error={errors.name}
                  autoComplete="name"
                />
                <Input
                  label="מספר תעודת זהות"
                  placeholder="9 ספרות"
                  value={plaintiffId}
                  onChangeText={setPlaintiffId}
                  error={errors.id}
                  keyboardType="number-pad"
                  maxLength={9}
                />
                <Input
                  label="מספר טלפון"
                  placeholder="05X-XXXXXXX"
                  value={plaintiffPhone}
                  onChangeText={setPlaintiffPhone}
                  error={errors.phone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.aiNote}>
                <Text style={styles.aiNoteIcon}>🤖</Text>
                <Text style={styles.aiNoteText}>
                  לאחר השלמת הפרטים, ה-AI יראיין אותך בעברית ויבנה את התיק שלך שאלה אחר שאלה.
                </Text>
              </View>

              <Button
                label="🚀 התחל ראיון AI"
                onPress={handleStart}
                size="lg"
                loading={loading}
                style={{ marginTop: Spacing.md }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={errorSheet}
        onClose={() => setErrorSheet(false)}
        icon="❌"
        title="שגיאה"
        body="לא ניתן לפתוח תביעה כרגע. נסה שוב."
        primaryLabel="נסה שוב"
        onPrimary={() => { setErrorSheet(false); handleStart(); }}
        secondaryLabel="ביטול"
        onSecondary={() => setErrorSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content:   { padding: SCREEN_PADDING },

  stepBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stepText: { ...Typography.tiny, fontWeight: '700', color: Colors.white },

  sectionTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeIcon:  { fontSize: 28, marginBottom: Spacing.xs },
  typeLabel: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.gray700,
    textAlign: 'center',
  },
  typeLabelSelected: { color: Colors.primaryDark },
  typeSub: {
    ...Typography.tiny,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 2,
  },
  typeSubSelected: { color: Colors.primary },

  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },

  aiNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
    marginBottom: Spacing.sm,
  },
  aiNoteIcon: { fontSize: 20 },
  aiNoteText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.primaryDark,
    textAlign: 'right',
    lineHeight: 20,
  },

  limitNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
  },
  limitNoteText: {
    ...Typography.tiny,
    color: Colors.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },
});
