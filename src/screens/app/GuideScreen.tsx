import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TabParamList, AppStackParamList } from '../../types/navigation';
import {
  Colors, Typography, Spacing, Radius, Shadows,
  SCREEN_PADDING, SECTION_GAP,
} from '../../theme';
import { Card } from '../../components/ui/Card';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'GuideTab'>,
  NativeStackScreenProps<AppStackParamList>
>;

interface StepCardProps {
  number: number;
  emoji: string;
  title: string;
  description: string;
}

function StepCard({ number, emoji, title, description }: StepCardProps) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.stepRow}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>
            {emoji} {title}
          </Text>
          <Text style={styles.stepDesc}>{description}</Text>
        </View>
      </View>
    </Card>
  );
}

const STEPS: StepCardProps[] = [
  {
    number: 1,
    emoji: '📝',
    title: 'בחר/י סוג תביעה',
    description: 'צרכנות, שכירות, עבודה, שכנים, חוזה או אחר. המערכת תתאים את השאלות לסוג שבחרת.',
  },
  {
    number: 2,
    emoji: '🤖',
    title: 'ראיון AI מונחה',
    description: 'ענה/י על שאלות מנחות שהמערכת שואלת. ה-AI מחלץ אוטומטית את כל הפרטים הנדרשים.',
  },
  {
    number: 3,
    emoji: '📊',
    title: 'ציון מוכנות',
    description: 'קבל/י ציון מוכנות, סיכוני סיכון, דגלי אדום והמלצות לשיפור.',
  },
  {
    number: 4,
    emoji: '📷',
    title: 'צרף/י ראיות',
    description: 'העלה תמונות, חשבוניות, התכתבויות, חוזים וכל מסמך רלוונטי.',
  },
  {
    number: 5,
    emoji: '⚖️',
    title: 'מוק-טריאל',
    description: 'תרגל/י משפט מדומה עם ה-AI כדי להתכונן ליום הדיון.',
  },
  {
    number: 6,
    emoji: '📄',
    title: 'ייצוא PDF',
    description: 'הורד/י טופס 1 מוכן להגשה לבית המשפט. כולל חתימה דיגיטלית.',
  },
];

const FAQ = [
  {
    q: 'מה הסכום המקסימלי בתביעות קטנות?',
    a: 'עד 87,600 ש״ח (נכון לינואר 2025). הסכום מתעדכן מדי שנה.',
  },
  {
    q: 'איפה מגישים את התביעה?',
    a: 'יש להגיש את הטופס יחד עם הראיות למזכירות בית המשפט הקרוב. ניתן גם להגיש אונליין.',
  },
  {
    q: 'כמה עולה להגיש תביעה קטנה?',
    a: 'אגרה בסך של 1% מסכום התביעה, מינימום 87 ש״ח ומקסימום 876 ש״ח.',
  },
  {
    q: 'האם אני צריך עורך דין?',
    a: 'לא! בתביעות קטנות אין חובת ייצוג עו״ד. האפליקציה שלנו עוזרת להכין את התביעה בעצמך.',
  },
];

export function GuideScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>מדריך</Text>
        <Text style={styles.headerSub}>איך מגישים תביעה קטנה ב-6 צעדים</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>⚖️</Text>
          <Text style={styles.heroTitle}>תביעות קטנות</Text>
          <Text style={styles.heroSub}>
            תביעות קטנות הן הדרך הפשוטה והזולה ביותר לפתור סכסוכים אזרחיים ללא עו״ד.
          </Text>
        </View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>התהליך</Text>
        {STEPS.map(step => (
          <StepCard key={step.number} {...step} />
        ))}

        {/* CTA */}
        <PrimaryButton
          title="התחל תביעה חדשה"
          onPress={() => navigation.navigate('NewClaim')}
          icon="⚖️"
          style={{ marginTop: Spacing.sm, marginBottom: SECTION_GAP }}
        />

        {/* FAQ */}
        <Text style={styles.sectionTitle}>שאלות נפוצות</Text>
        {FAQ.map((item, i) => (
          <Card key={i} style={styles.faqCard}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </Card>
        ))}

        {/* Tips */}
        <View style={styles.tipBanner}>
          <Text style={styles.tipTitle}>💡 טיפים להצלחה</Text>
          <Text style={styles.tipText}>
            • הכינו את כל הראיות מראש — חשבוניות, התכתבויות, תמונות
          </Text>
          <Text style={styles.tipText}>
            • תרגלו מוק-טריאל כדי להתכונן לשאלות השופט
          </Text>
          <Text style={styles.tipText}>
            • שימו על ציר זמן — מרגע שנודע לכם על האירוע
          </Text>
          <Text style={styles.tipText}>
            • השתמשו בציון המוכנות כדי לראות איפה לשפר
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  // Header
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
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
  scrollContent: { padding: SCREEN_PADDING },

  // Hero banner
  heroBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: SECTION_GAP,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
  },
  heroEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  heroTitle: { ...Typography.h3, color: Colors.primaryDark, marginBottom: Spacing.sm },
  heroSub: {
    ...Typography.body,
    color: Colors.primaryDark,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.85,
  },

  // Section
  sectionTitle: {
    ...Typography.bodyLarge,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },

  // Step card
  stepCard: { marginBottom: Spacing.sm },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    ...Typography.button,
    color: Colors.white,
  },
  stepContent: { flex: 1 },
  stepTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right' },
  stepDesc: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 22,
  },

  // FAQ
  faqCard: { marginBottom: Spacing.sm },
  faqQ: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right', marginBottom: 6 },
  faqA: { ...Typography.small, color: Colors.muted, textAlign: 'right', lineHeight: 22 },

  // Tip banner
  tipBanner: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#16A34A20',
  },
  tipTitle: {
    ...Typography.bodyLarge,
    color: Colors.success,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  tipText: {
    ...Typography.small,
    color: Colors.gray700,
    textAlign: 'right',
    lineHeight: 24,
    marginBottom: 2,
  },
});
