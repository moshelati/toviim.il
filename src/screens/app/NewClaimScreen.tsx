import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { createClaim } from '../../lib/claimsService';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewClaim'>;

const CLAIM_TYPES = [
  { id: 'consumer',  label: '🛒 צרכנות',       sub: 'מוצר פגום, שירות גרוע' },
  { id: 'landlord',  label: '🏠 שכירות',        sub: 'פיקדון, נזקים בדירה' },
  { id: 'employer',  label: '💼 עבודה',          sub: 'שכר, פיצויים' },
  { id: 'neighbor',  label: '🏘️ שכנים',         sub: 'נזקים, מטרד' },
  { id: 'contract',  label: '📝 חוזה',           sub: 'הפרת הסכם' },
  { id: 'other',     label: '⚖️ אחר',            sub: 'סיבה אחרת' },
];

export function NewClaimScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [step,           setStep]           = useState<1 | 2>(1);
  const [selectedType,   setSelectedType]   = useState('');
  const [plaintiffName,  setPlaintiffName]  = useState(user?.displayName ?? '');
  const [plaintiffId,    setPlaintiffId]    = useState('');
  const [plaintiffPhone, setPlaintiffPhone] = useState('');
  const [loading,        setLoading]        = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});

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
      const claimId = await createClaim(user.uid, plaintiffName.trim());
      navigation.replace('ClaimChat', { claimId, claimType: selectedType });
    } catch (e) {
      Alert.alert('שגיאה', 'לא ניתן לפתוח תביעה כרגע. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[700]} />

      <LinearGradient colors={[COLORS.primary[700], COLORS.primary[600]]} style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? setStep(1) : navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{step === 1 ? 'סוג התביעה' : 'הפרטים שלך'}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{step}/2</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {step === 1 ? (
            <>
              <Text style={styles.sectionTitle}>על מה התביעה?</Text>
              <Text style={styles.sectionSub}>בחר/י קטגוריה — ה-AI ידע לשאול את השאלות הנכונות</Text>
              <View style={styles.typeGrid}>
                {CLAIM_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, selectedType === t.id && styles.typeCardSelected]}
                    onPress={() => setSelectedType(t.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.typeIcon}>{t.label.split(' ')[0]}</Text>
                    <Text style={[styles.typeLabel, selectedType === t.id && styles.typeLabelSelected]}>
                      {t.label.split(' ').slice(1).join(' ')}
                    </Text>
                    <Text style={[styles.typeSub, selectedType === t.id && styles.typeSubSelected]}>
                      {t.sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button
                label="המשך ←"
                onPress={() => { if (selectedType) setStep(2); }}
                size="lg"
                disabled={!selectedType}
                style={{ marginTop: SPACING.lg }}
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>הפרטים שלך</Text>
              <Text style={styles.sectionSub}>הפרטים יופיעו בכתב התביעה הרשמי</Text>

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
                style={{ marginTop: SPACING.md }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.gray[50] },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md + 4,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 20, color: COLORS.white },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  stepBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  stepText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray[800], textAlign: 'right', marginBottom: SPACING.xs },
  sectionSub:   { fontSize: 14, color: COLORS.gray[500], textAlign: 'right', marginBottom: SPACING.lg, lineHeight: 22 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeCard: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.gray[200],
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  typeCardSelected: { borderColor: COLORS.primary[500], backgroundColor: COLORS.primary[50] },
  typeIcon:  { fontSize: 28, marginBottom: SPACING.xs },
  typeLabel: { fontSize: 15, fontWeight: '700', color: COLORS.gray[700], textAlign: 'center' },
  typeLabelSelected: { color: COLORS.primary[700] },
  typeSub:   { fontSize: 11, color: COLORS.gray[400], textAlign: 'center', marginTop: 2 },
  typeSubSelected: { color: COLORS.primary[500] },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  aiNote: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.primary[50], borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary[100],
    marginBottom: SPACING.sm,
  },
  aiNoteIcon: { fontSize: 20 },
  aiNoteText: { flex: 1, fontSize: 13, color: COLORS.primary[700], textAlign: 'right', lineHeight: 20 },
});
