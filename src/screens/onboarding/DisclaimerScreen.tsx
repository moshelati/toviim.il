import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { AppHeader } from '../../components/ui/AppHeader';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Disclaimer'>;

export function DisclaimerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const [checked4, setChecked4] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const allChecked = checked1 && checked2 && checked3 && checked4;

  function handleContinue() {
    if (!allChecked) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start();
      return;
    }
    navigation.navigate('SignUp');
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="לפני שמתחילים"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>הצהרה משפטית חשובה</Text>
          <Text style={styles.warningText}>
            האפליקציה הזו משתמשת בבינה מלאכותית (AI) לצורך סיוע בהכנת תביעות קטנות.
          </Text>
        </View>

        {/* Disclaimer box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>📋 מה שאת/ה צריכ/ה לדעת</Text>

          {[
            {
              icon: '🤖',
              title: 'זה לא עורך דין',
              body: 'AI אינו מחליף ייעוץ משפטי מקצועי. האפליקציה עוזרת לארגן מידע, אך אינה מספקת ייעוץ משפטי מחייב.',
            },
            {
              icon: '⚖️',
              title: 'אחריות אישית',
              body: 'אתה/את אחראי/ת לנכונות המידע שתמסור/י. הגשת מידע שגוי בבית משפט עלולה להיות בעייתית.',
            },
            {
              icon: '🔒',
              title: 'פרטיות הנתונים',
              body: 'פרטיך נשמרים בצורה מוצפנת בשרתי Firebase. המידע לא יועבר לצד שלישי ללא הסכמתך.',
            },
            {
              icon: '💡',
              title: 'הגבלת תביעות קטנות',
              body: 'שירות תביעות קטנות מיועד לסכומים עד 38,800 ₪. מקרים מעבר לכך יש להגיש בבית משפט שלום.',
            },
          ].map((item, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoBody}>{item.body}</Text>
              </View>
              <Text style={styles.infoIcon}>{item.icon}</Text>
            </View>
          ))}
        </View>

        {/* Checkboxes */}
        <Animated.View
          style={[styles.checkboxSection, { transform: [{ translateX: shakeAnim }] }]}
        >
          <Text style={styles.checkboxTitle}>אנא אשר/י את כל הסעיפים:</Text>

          <Checkbox
            checked={checked1}
            onToggle={() => setChecked1(!checked1)}
            label={
              <Text style={styles.checkboxLabel}>
                <Text style={styles.checkboxLabelBold}>הבנתי: </Text>
                האפליקציה משתמשת ב-AI ואינה מחליפה עורך דין. אני משתמש/ת בשירות על אחריותי האישית.
              </Text>
            }
          />

          <View style={styles.divider} />

          <Checkbox
            checked={checked2}
            onToggle={() => setChecked2(!checked2)}
            label={
              <Text style={styles.checkboxLabel}>
                קראתי ואני מסכים/ה ל
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Terms')}
                >
                  תנאי השירות
                </Text>
                {' '}של האפליקציה.
              </Text>
            }
          />

          <View style={styles.divider} />

          <Checkbox
            checked={checked3}
            onToggle={() => setChecked3(!checked3)}
            label={
              <Text style={styles.checkboxLabel}>
                קראתי ואני מסכים/ה ל
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Privacy')}
                >
                  מדיניות הפרטיות
                </Text>
                {' '}ולאיסוף הנתונים המתואר בה.
              </Text>
            }
          />

          <View style={styles.divider} />

          <Checkbox
            checked={checked4}
            onToggle={() => setChecked4(!checked4)}
            label={
              <Text style={styles.checkboxLabel}>
                <Text style={styles.checkboxLabelBold}>AI: </Text>
                אני מסכים/ה לשימוש בבינה מלאכותית (AI) לעיבוד המידע שאמסור, בהתאם למדיניות הפרטיות.
              </Text>
            }
          />
        </Animated.View>

        {!allChecked && (
          <Text style={styles.checkAllHint}>יש לסמן את כל התיבות כדי להמשיך</Text>
        )}

        <Button
          label="אני מסכים/ה - בוא/י נתחיל"
          onPress={handleContinue}
          size="lg"
          disabled={!allChecked}
          style={styles.continueBtn}
        />

        <Text style={styles.footerNote}>
          בלחיצה על הכפתור אתה/את מאשר/ת שקראת את כל הסעיפים לעיל.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.white },
  scroll:       { flex: 1 },
  scrollContent:{ padding: SCREEN_PADDING },

  warningBanner: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  warningIcon:  { fontSize: 32, marginBottom: Spacing.sm },
  warningTitle: { ...Typography.bodyLarge, color: Colors.warning, marginBottom: Spacing.xs, textAlign: 'center' },
  warningText:  { ...Typography.small, color: Colors.warning, textAlign: 'center', lineHeight: 22 },

  disclaimerBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  disclaimerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.base,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  infoIcon:    { fontSize: 20, marginTop: 2 },
  infoContent: { flex: 1 },
  infoTitle:   { ...Typography.small, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 2 },
  infoBody:    { ...Typography.caption, color: Colors.muted, textAlign: 'right', lineHeight: 20 },

  checkboxSection: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
  },
  checkboxTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.primaryDark,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  checkboxLabel: {
    ...Typography.small,
    color: Colors.gray700,
    textAlign: 'right',
    lineHeight: 22,
  },
  checkboxLabelBold: { fontWeight: '700', color: Colors.text },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
  divider: {
    height: 1, backgroundColor: Colors.primaryMid + '30', marginVertical: Spacing.xs,
  },

  checkAllHint: {
    ...Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  continueBtn: { marginBottom: Spacing.md },
  footerNote: {
    ...Typography.tiny,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 18,
  },
});
