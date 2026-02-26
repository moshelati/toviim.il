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
    emoji: '\uD83D\uDCDD',
    title: '\u05D1\u05D7\u05E8/\u05D9 \u05E1\u05D5\u05D2 \u05EA\u05D1\u05D9\u05E2\u05D4',
    description: '\u05E6\u05E8\u05DB\u05E0\u05D5\u05EA, \u05E9\u05DB\u05D9\u05E8\u05D5\u05EA, \u05E2\u05D1\u05D5\u05D3\u05D4, \u05E9\u05DB\u05E0\u05D9\u05DD, \u05D7\u05D5\u05D6\u05D4 \u05D0\u05D5 \u05D0\u05D7\u05E8. \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05EA\u05EA\u05D0\u05D9\u05DD \u05D0\u05EA \u05D4\u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05E1\u05D5\u05D2 \u05E9\u05D1\u05D7\u05E8\u05EA.',
  },
  {
    number: 2,
    emoji: '\uD83E\uDD16',
    title: '\u05E8\u05D0\u05D9\u05D5\u05DF AI \u05DE\u05D5\u05E0\u05D7\u05D4',
    description: '\u05E2\u05E0\u05D4/\u05D9 \u05E2\u05DC \u05E9\u05D0\u05DC\u05D5\u05EA \u05DE\u05E0\u05D7\u05D5\u05EA \u05E9\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05E9\u05D5\u05D0\u05DC\u05EA. \u05D4-AI \u05DE\u05D7\u05DC\u05E5 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D0\u05EA \u05DB\u05DC \u05D4\u05E4\u05E8\u05D8\u05D9\u05DD \u05D4\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD.',
  },
  {
    number: 3,
    emoji: '\uD83D\uDCCA',
    title: '\u05E6\u05D9\u05D5\u05DF \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA',
    description: '\u05E7\u05D1\u05DC/\u05D9 \u05E6\u05D9\u05D5\u05DF \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA, \u05E1\u05D9\u05DB\u05D5\u05E0\u05D9 \u05E1\u05D9\u05DB\u05D5\u05DF, \u05D3\u05D2\u05DC\u05D9 \u05D0\u05D3\u05D5\u05DD \u05D5\u05D4\u05DE\u05DC\u05E6\u05D5\u05EA \u05DC\u05E9\u05D9\u05E4\u05D5\u05E8.',
  },
  {
    number: 4,
    emoji: '\uD83D\uDCF7',
    title: '\u05E6\u05E8\u05E3/\u05D9 \u05E8\u05D0\u05D9\u05D5\u05EA',
    description: '\u05D4\u05E2\u05DC\u05D4 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA, \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA, \u05D4\u05EA\u05DB\u05EA\u05D1\u05D5\u05D9\u05D5\u05EA, \u05D7\u05D5\u05D6\u05D9\u05DD \u05D5\u05DB\u05DC \u05DE\u05E1\u05DE\u05DA \u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9.',
  },
  {
    number: 5,
    emoji: '\u2696\uFE0F',
    title: '\u05DE\u05D5\u05E7-\u05D8\u05E8\u05D9\u05D0\u05DC',
    description: '\u05EA\u05E8\u05D2\u05DC/\u05D9 \u05DE\u05E9\u05E4\u05D8 \u05DE\u05D3\u05D5\u05DE\u05D4 \u05E2\u05DD \u05D4-AI \u05DB\u05D3\u05D9 \u05DC\u05D4\u05EA\u05DB\u05D5\u05E0\u05DF \u05DC\u05D9\u05D5\u05DD \u05D4\u05D3\u05D9\u05D5\u05DF.',
  },
  {
    number: 6,
    emoji: '\uD83D\uDCC4',
    title: '\u05D9\u05D9\u05E6\u05D5\u05D0 PDF',
    description: '\u05D4\u05D5\u05E8\u05D3/\u05D9 \u05D8\u05D5\u05E4\u05E1 1 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05D2\u05E9\u05D4 \u05DC\u05D1\u05D9\u05EA \u05D4\u05DE\u05E9\u05E4\u05D8. \u05DB\u05D5\u05DC\u05DC \u05D7\u05EA\u05D9\u05DE\u05D4 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA.',
  },
];

const FAQ = [
  {
    q: '\u05DE\u05D4 \u05D4\u05E1\u05DB\u05D5\u05DD \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05D1\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA?',
    a: '\u05E2\u05D3 87,600 \u05E9\u05F4\u05D7 (\u05E0\u05DB\u05D5\u05DF \u05DC\u05D9\u05E0\u05D5\u05D0\u05E8 2025). \u05D4\u05E1\u05DB\u05D5\u05DD \u05DE\u05EA\u05E2\u05D3\u05DB\u05DF \u05DE\u05D3\u05D9 \u05E9\u05E0\u05D4.',
  },
  {
    q: '\u05D0\u05D9\u05E4\u05D4 \u05DE\u05D2\u05D9\u05E9\u05D9\u05DD \u05D0\u05EA \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4?',
    a: '\u05D9\u05E9 \u05DC\u05D4\u05D2\u05D9\u05E9 \u05D0\u05EA \u05D4\u05D8\u05D5\u05E4\u05E1 \u05D9\u05D7\u05D3 \u05E2\u05DD \u05D4\u05E8\u05D0\u05D9\u05D5\u05EA \u05DC\u05DE\u05D6\u05DB\u05D9\u05E8\u05D5\u05EA \u05D1\u05D9\u05EA \u05D4\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05E8\u05D5\u05D1. \u05E0\u05D9\u05EA\u05DF \u05D2\u05DD \u05DC\u05D4\u05D2\u05D9\u05E9 \u05D0\u05D5\u05E0\u05DC\u05D9\u05D9\u05DF.',
  },
  {
    q: '\u05DB\u05DE\u05D4 \u05E2\u05D5\u05DC\u05D4 \u05DC\u05D4\u05D2\u05D9\u05E9 \u05EA\u05D1\u05D9\u05E2\u05D4 \u05E7\u05D8\u05E0\u05D4?',
    a: '\u05D0\u05D2\u05E8\u05D4 \u05D1\u05E1\u05DA \u05E9\u05DC 1% \u05DE\u05E1\u05DB\u05D5\u05DD \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4, \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD 87 \u05E9\u05F4\u05D7 \u05D5\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 876 \u05E9\u05F4\u05D7.',
  },
  {
    q: '\u05D4\u05D0\u05DD \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05E2\u05D5\u05E8\u05DA \u05D3\u05D9\u05DF?',
    a: '\u05DC\u05D0! \u05D1\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA \u05D0\u05D9\u05DF \u05D7\u05D5\u05D1\u05EA \u05D9\u05D9\u05E6\u05D5\u05D2 \u05E2\u05D5\u05F4\u05D3. \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05E9\u05DC\u05E0\u05D5 \u05E2\u05D5\u05D6\u05E8\u05EA \u05DC\u05D4\u05DB\u05D9\u05DF \u05D0\u05EA \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05D1\u05E2\u05E6\u05DE\u05DA.',
  },
];

export function GuideScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>{'\u05DE\u05D3\u05E8\u05D9\u05DA'}</Text>
        <Text style={styles.headerSub}>{'\u05D0\u05D9\u05DA \u05DE\u05D2\u05D9\u05E9\u05D9\u05DD \u05EA\u05D1\u05D9\u05E2\u05D4 \u05E7\u05D8\u05E0\u05D4 \u05D1-6 \u05E6\u05E2\u05D3\u05D9\u05DD'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>{'\u2696\uFE0F'}</Text>
          <Text style={styles.heroTitle}>{'\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA'}</Text>
          <Text style={styles.heroSub}>
            {'\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA \u05D4\u05DF \u05D4\u05D3\u05E8\u05DA \u05D4\u05E4\u05E9\u05D5\u05D8\u05D4 \u05D5\u05D4\u05D6\u05D5\u05DC\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05DC\u05E4\u05EA\u05D5\u05E8 \u05E1\u05DB\u05E1\u05D5\u05DB\u05D9\u05DD \u05D0\u05D6\u05E8\u05D7\u05D9\u05D9\u05DD \u05DC\u05DC\u05D0 \u05E2\u05D5\u05F4\u05D3.'}
          </Text>
        </View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>{'\u05D4\u05EA\u05D4\u05DC\u05D9\u05DA'}</Text>
        {STEPS.map(step => (
          <StepCard key={step.number} {...step} />
        ))}

        {/* CTA */}
        <PrimaryButton
          title={'\u05D4\u05EA\u05D7\u05DC \u05EA\u05D1\u05D9\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4'}
          onPress={() => navigation.navigate('NewClaim')}
          icon={'\u2696\uFE0F'}
          style={{ marginTop: Spacing.sm, marginBottom: SECTION_GAP }}
        />

        {/* FAQ */}
        <Text style={styles.sectionTitle}>{'\u05E9\u05D0\u05DC\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D5\u05EA'}</Text>
        {FAQ.map((item, i) => (
          <Card key={i} style={styles.faqCard}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </Card>
        ))}

        {/* Tips */}
        <View style={styles.tipBanner}>
          <Text style={styles.tipTitle}>{'\uD83D\uDCA1 \u05D8\u05D9\u05E4\u05D9\u05DD \u05DC\u05D4\u05E6\u05DC\u05D7\u05D4'}</Text>
          <Text style={styles.tipText}>
            {'\u2022 \u05D4\u05DB\u05D9\u05E0\u05D5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E8\u05D0\u05D9\u05D5\u05EA \u05DE\u05E8\u05D0\u05E9 \u2014 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA, \u05D4\u05EA\u05DB\u05EA\u05D1\u05D5\u05D9\u05D5\u05EA, \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA'}
          </Text>
          <Text style={styles.tipText}>
            {'\u2022 \u05EA\u05E8\u05D2\u05DC\u05D5 \u05DE\u05D5\u05E7-\u05D8\u05E8\u05D9\u05D0\u05DC \u05DB\u05D3\u05D9 \u05DC\u05D4\u05EA\u05DB\u05D5\u05E0\u05DF \u05DC\u05E9\u05D0\u05DC\u05D5\u05EA \u05D4\u05E9\u05D5\u05E4\u05D8'}
          </Text>
          <Text style={styles.tipText}>
            {'\u2022 \u05E9\u05D9\u05DE\u05D5 \u05E2\u05DC \u05E6\u05D9\u05E8 \u05D6\u05DE\u05DF \u2014 \u05DE\u05E8\u05D2\u05E2 \u05E9\u05E0\u05D5\u05D3\u05E2 \u05DC\u05DB\u05DD \u05E2\u05DC \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2'}
          </Text>
          <Text style={styles.tipText}>
            {'\u2022 \u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05E6\u05D9\u05D5\u05DF \u05D4\u05DE\u05D5\u05DB\u05E0\u05D5\u05EA \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05D9\u05E4\u05D4 \u05DC\u05E9\u05E4\u05E8'}
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
