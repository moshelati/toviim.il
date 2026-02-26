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
        title={'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>{'\u26A0\uFE0F'}</Text>
          <Text style={styles.warningTitle}>{'\u05D4\u05E6\u05D4\u05E8\u05D4 \u05DE\u05E9\u05E4\u05D8\u05D9\u05EA \u05D7\u05E9\u05D5\u05D1\u05D4'}</Text>
          <Text style={styles.warningText}>
            {'\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D4\u05D6\u05D5 \u05DE\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1\u05D1\u05D9\u05E0\u05D4 \u05DE\u05DC\u05D0\u05DB\u05D5\u05EA\u05D9\u05EA (AI) \u05DC\u05E6\u05D5\u05E8\u05DA \u05E1\u05D9\u05D5\u05E2 \u05D1\u05D4\u05DB\u05E0\u05EA \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA.'}
          </Text>
        </View>

        {/* Disclaimer box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>{'\uD83D\uDCCB \u05DE\u05D4 \u05E9\u05D0\u05EA/\u05D4 \u05E6\u05E8\u05D9\u05DB/\u05D4 \u05DC\u05D3\u05E2\u05EA'}</Text>

          {[
            {
              icon: '\uD83E\uDD16',
              title: '\u05D6\u05D4 \u05DC\u05D0 \u05E2\u05D5\u05E8\u05DA \u05D3\u05D9\u05DF',
              body: 'AI \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D7\u05DC\u05D9\u05E3 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9. \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05E2\u05D5\u05D6\u05E8\u05EA \u05DC\u05D0\u05E8\u05D2\u05DF \u05DE\u05D9\u05D3\u05E2, \u05D0\u05DA \u05D0\u05D9\u05E0\u05D4 \u05DE\u05E1\u05E4\u05E7\u05EA \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E9\u05E4\u05D8\u05D9 \u05DE\u05D7\u05D9\u05D9\u05D1.',
            },
            {
              icon: '\u2696\uFE0F',
              title: '\u05D0\u05D7\u05E8\u05D9\u05D5\u05EA \u05D0\u05D9\u05E9\u05D9\u05EA',
              body: '\u05D0\u05EA\u05D4/\u05D0\u05EA \u05D0\u05D7\u05E8\u05D0\u05D9/\u05EA \u05DC\u05E0\u05DB\u05D5\u05E0\u05D5\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05EA\u05DE\u05E1\u05D5\u05E8/\u05D9. \u05D4\u05D2\u05E9\u05EA \u05DE\u05D9\u05D3\u05E2 \u05E9\u05D2\u05D5\u05D9 \u05D1\u05D1\u05D9\u05EA \u05DE\u05E9\u05E4\u05D8 \u05E2\u05DC\u05D5\u05DC\u05D4 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05E2\u05D9\u05D9\u05EA\u05D9\u05EA.',
            },
            {
              icon: '\uD83D\uDD12',
              title: '\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD',
              body: '\u05E4\u05E8\u05D8\u05D9\u05DA \u05E0\u05E9\u05DE\u05E8\u05D9\u05DD \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D5\u05E6\u05E4\u05E0\u05EA \u05D1\u05E9\u05E8\u05EA\u05D9 Firebase. \u05D4\u05DE\u05D9\u05D3\u05E2 \u05DC\u05D0 \u05D9\u05D5\u05E2\u05D1\u05E8 \u05DC\u05E6\u05D3 \u05E9\u05DC\u05D9\u05E9\u05D9 \u05DC\u05DC\u05D0 \u05D4\u05E1\u05DB\u05DE\u05EA\u05DA.',
            },
            {
              icon: '\uD83D\uDCA1',
              title: '\u05D4\u05D2\u05D1\u05DC\u05EA \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA',
              body: '\u05E9\u05D9\u05E8\u05D5\u05EA \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA \u05DE\u05D9\u05D5\u05E2\u05D3 \u05DC\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05E2\u05D3 38,800 \u20AA. \u05DE\u05E7\u05E8\u05D9\u05DD \u05DE\u05E2\u05D1\u05E8 \u05DC\u05DB\u05DA \u05D9\u05E9 \u05DC\u05D4\u05D2\u05D9\u05E9 \u05D1\u05D1\u05D9\u05EA \u05DE\u05E9\u05E4\u05D8 \u05E9\u05DC\u05D5\u05DD.',
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
          <Text style={styles.checkboxTitle}>{'\u05D0\u05E0\u05D0 \u05D0\u05E9\u05E8/\u05D9 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E1\u05E2\u05D9\u05E4\u05D9\u05DD:'}</Text>

          <Checkbox
            checked={checked1}
            onToggle={() => setChecked1(!checked1)}
            label={
              <Text style={styles.checkboxLabel}>
                <Text style={styles.checkboxLabelBold}>{'\u05D4\u05D1\u05E0\u05EA\u05D9: '}</Text>
                {'\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DE\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1-AI \u05D5\u05D0\u05D9\u05E0\u05D4 \u05DE\u05D7\u05DC\u05D9\u05E4\u05D4 \u05E2\u05D5\u05E8\u05DA \u05D3\u05D9\u05DF. \u05D0\u05E0\u05D9 \u05DE\u05E9\u05EA\u05DE\u05E9/\u05EA \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA \u05E2\u05DC \u05D0\u05D7\u05E8\u05D9\u05D5\u05EA\u05D9 \u05D4\u05D0\u05D9\u05E9\u05D9\u05EA.'}
              </Text>
            }
          />

          <View style={styles.divider} />

          <Checkbox
            checked={checked2}
            onToggle={() => setChecked2(!checked2)}
            label={
              <Text style={styles.checkboxLabel}>
                {'\u05E7\u05E8\u05D0\u05EA\u05D9 \u05D5\u05D0\u05E0\u05D9 \u05DE\u05E1\u05DB\u05D9\u05DD/\u05D4 \u05DC'}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Terms')}
                >
                  {'\u05EA\u05E0\u05D0\u05D9 \u05D4\u05E9\u05D9\u05E8\u05D5\u05EA'}
                </Text>
                {' \u05E9\u05DC \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4.'}
              </Text>
            }
          />

          <View style={styles.divider} />

          <Checkbox
            checked={checked3}
            onToggle={() => setChecked3(!checked3)}
            label={
              <Text style={styles.checkboxLabel}>
                {'\u05E7\u05E8\u05D0\u05EA\u05D9 \u05D5\u05D0\u05E0\u05D9 \u05DE\u05E1\u05DB\u05D9\u05DD/\u05D4 \u05DC'}
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('Privacy')}
                >
                  {'\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA'}
                </Text>
                {' \u05D5\u05DC\u05D0\u05D9\u05E1\u05D5\u05E3 \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D4\u05DE\u05EA\u05D5\u05D0\u05E8 \u05D1\u05D4.'}
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
                {'\u05D0\u05E0\u05D9 \u05DE\u05E1\u05DB\u05D9\u05DD/\u05D4 \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D1\u05D9\u05E0\u05D4 \u05DE\u05DC\u05D0\u05DB\u05D5\u05EA\u05D9\u05EA (AI) \u05DC\u05E2\u05D9\u05D1\u05D5\u05D3 \u05D4\u05DE\u05D9\u05D3\u05E2 \u05E9\u05D0\u05DE\u05E1\u05D5\u05E8, \u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA.'}
              </Text>
            }
          />
        </Animated.View>

        {!allChecked && (
          <Text style={styles.checkAllHint}>{'\u05D9\u05E9 \u05DC\u05E1\u05DE\u05DF \u05D0\u05EA \u05DB\u05DC \u05D4\u05EA\u05D9\u05D1\u05D5\u05EA \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA'}</Text>
        )}

        <Button
          label={'\u05D0\u05E0\u05D9 \u05DE\u05E1\u05DB\u05D9\u05DD/\u05D4 - \u05D1\u05D5\u05D0/\u05D9 \u05E0\u05EA\u05D7\u05D9\u05DC'}
          onPress={handleContinue}
          size="lg"
          disabled={!allChecked}
          style={styles.continueBtn}
        />

        <Text style={styles.footerNote}>
          {'\u05D1\u05DC\u05D7\u05D9\u05E6\u05D4 \u05E2\u05DC \u05D4\u05DB\u05E4\u05EA\u05D5\u05E8 \u05D0\u05EA\u05D4/\u05D0\u05EA \u05DE\u05D0\u05E9\u05E8/\u05EA \u05E9\u05E7\u05E8\u05D0\u05EA \u05D0\u05EA \u05DB\u05DC \u05D4\u05E1\u05E2\u05D9\u05E4\u05D9\u05DD \u05DC\u05E2\u05D9\u05DC.'}
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
