import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Disclaimer'>;

export function DisclaimerScreen({ navigation }: Props) {
  const [checked1, setChecked1] = useState(false); // Main AI disclaimer
  const [checked2, setChecked2] = useState(false); // Terms of Service
  const [checked3, setChecked3] = useState(false); // Privacy Policy

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const allChecked = checked1 && checked2 && checked3;

  function handleContinue() {
    if (!allChecked) {
      // Shake animation to draw attention to unchecked boxes
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>לפני שמתחילים</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
                {'קראתי ואני מסכימ/ה ל'}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://toviim.il/terms')}
                >
                  תנאי השירות
                </Text>
                {' של האפליקציה.'}
              </Text>
            }
          />

          <View style={styles.divider} />

          <Checkbox
            checked={checked3}
            onToggle={() => setChecked3(!checked3)}
            label={
              <Text style={styles.checkboxLabel}>
                {'קראתי ואני מסכימ/ה ל'}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://toviim.il/privacy')}
                >
                  מדיניות הפרטיות
                </Text>
                {' ולאיסוף הנתונים המתואר בה.'}
              </Text>
            }
          />
        </Animated.View>

        {!allChecked && (
          <Text style={styles.checkAllHint}>יש לסמן את כל התיבות כדי להמשיך</Text>
        )}

        <Button
          label="אני מסכימ/ה - בוא/י נתחיל"
          onPress={handleContinue}
          size="lg"
          disabled={!allChecked}
          style={styles.continueBtn}
        />

        <Text style={styles.footerNote}>
          בלחיצה על הכפתור אתה/את מאשר/ת שקראת את כל הסעיפים לעיל.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.white },
  scroll:       { flex: 1 },
  scrollContent:{ padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.primary[600] },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.gray[800],
  },

  warningBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningIcon:  { fontSize: 32, marginBottom: SPACING.sm },
  warningTitle: { fontSize: 17, fontWeight: '700', color: '#92400e', marginBottom: SPACING.xs, textAlign: 'center' },
  warningText:  { fontSize: 14, color: '#92400e', textAlign: 'center', lineHeight: 22 },

  disclaimerBox: {
    backgroundColor: COLORS.gray[50],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  disclaimerTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.gray[800],
    textAlign: 'right', marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoIcon:    { fontSize: 20, marginTop: 2 },
  infoContent: { flex: 1 },
  infoTitle:   { fontSize: 14, fontWeight: '600', color: COLORS.gray[800], textAlign: 'right', marginBottom: 2 },
  infoBody:    { fontSize: 13, color: COLORS.gray[500], textAlign: 'right', lineHeight: 20 },

  checkboxSection: {
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  checkboxTitle: {
    fontSize: 15, fontWeight: '600', color: COLORS.primary[800],
    textAlign: 'right', marginBottom: SPACING.sm,
  },
  checkboxLabel: {
    fontSize: 14, color: COLORS.gray[700], textAlign: 'right', lineHeight: 22,
  },
  checkboxLabelBold: { fontWeight: '700', color: COLORS.gray[800] },
  link: { color: COLORS.primary[600], textDecorationLine: 'underline' },
  divider: {
    height: 1, backgroundColor: COLORS.primary[100], marginVertical: SPACING.xs,
  },

  checkAllHint: {
    fontSize: 13, color: COLORS.danger, textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  continueBtn: { marginBottom: SPACING.md },
  footerNote: {
    fontSize: 12, color: COLORS.gray[400], textAlign: 'center', lineHeight: 18,
  },
});
