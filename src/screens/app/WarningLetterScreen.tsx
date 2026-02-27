import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Share, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim } from '../../lib/claimsService';
import { getOrCreateGraph } from '../../graph/storage';
import { getPlaintiff, getDefendants, getDemands, getTotalAmount } from '../../graph/queries';
import { sendMessage } from '../../ai';
import type { GeminiMessage } from '../../ai';
import type { CaseGraph } from '../../graph/types';
import type { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton, SecondaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'WarningLetter'>;

export function WarningLetterScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [letter, setLetter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const c = await getClaim(claimId);
      if (!c) return;
      setClaim(c);

      const g = await getOrCreateGraph(c);
      setGraph(g);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [claimId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const generateLetter = useCallback(async () => {
    if (!graph || !claim) return;

    setGenerating(true);
    try {
      const plaintiff = getPlaintiff(graph);
      const defendants = getDefendants(graph);
      const demands = getDemands(graph);
      const totalAmount = getTotalAmount(graph);

      const systemPrompt = `
אתה עוזר משפטי שכותב מכתב התראה (מכתב דרישה) לפני תביעה בבית משפט לתביעות קטנות בישראל.
המכתב צריך להיות:
- בעברית פורמלית וברורה
- מנומק ומבוסס על עובדות
- כולל דרישה ברורה עם מועד לתשובה (14 ימים)
- מציין שבהעדר תגובה תוגש תביעה
- לא מהווה ייעוץ משפטי

חשוב: המכתב הוא כלי עזר בלבד. מומלץ להתייעץ עם עורך דין.
      `.trim();

      const userPrompt = `
כתוב מכתב התראה לפי הפרטים הבאים:

תובע: ${plaintiff?.data.fullName || claim.plaintiffName || 'לא ידוע'}
ת.ז תובע: ${plaintiff?.data.idNumber || ''}
כתובת תובע: ${plaintiff?.data.address || ''}

נתבע: ${defendants[0]?.data.fullName || claim.defendant || 'לא ידוע'}
כתובת נתבע: ${defendants[0]?.data.address || ''}

סכום: ${totalAmount > 0 ? `${totalAmount.toLocaleString('he-IL')} ₪` : 'לא ידוע'}

דרישות:
${demands.map(d => `- ${d.data.description || ''} ${d.data.amount ? `(${d.data.amount.toLocaleString('he-IL')} ₪)` : ''}`).join('\n') || 'לא פורטו'}

סיכום עובדתי:
${claim.factsSummary || 'לא סופק'}

כתוב את המכתב המלא, כולל כותרת, פתיח, גוף, דרישה, סיום וחתימה.
      `.trim();

      const messages: GeminiMessage[] = [
        { role: 'user', parts: [{ text: userPrompt }] },
      ];

      const response = await sendMessage(messages, systemPrompt, {
        temperature: 0.5,
        maxTokens: 3000,
      });

      setLetter(response);
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן ליצור את המכתב. נסה שוב.');
    }
    finally { setGenerating(false); }
  }, [graph, claim]);

  const handleShare = useCallback(async () => {
    if (!letter) return;
    try {
      await Share.share({
        message: letter,
        title: 'מכתב התראה',
      });
    } catch { /* silent */ }
  }, [letter]);

  if (loading || !claim) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="מכתב התראה"
        subtitle="דרישה לפני תביעה"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 למה מכתב התראה?</Text>
          <Text style={styles.infoText}>
            מכתב התראה (מכתב דרישה) נשלח לנתבע לפני הגשת תביעה.
            הוא מראה לבית המשפט שניסית לפתור את העניין מחוץ לכותלי בית המשפט,
            ויכול לחזק את התביעה שלך.
          </Text>
          <Text style={styles.infoDisclaimer}>
            ⚠️ המכתב נוצר באמצעות AI ואינו מהווה ייעוץ משפטי.
            מומלץ להתייעץ עם עורך דין לפני שליחה.
          </Text>
        </Card>

        {!letter ? (
          /* Generate button */
          <View style={styles.generateSection}>
            <Text style={styles.generateText}>
              לחץ ליצירת מכתב התראה על בסיס פרטי התביעה שלך
            </Text>
            <PrimaryButton
              title="צור מכתב התראה"
              icon="✉️"
              onPress={generateLetter}
              loading={generating}
            />
          </View>
        ) : (
          /* Letter display */
          <>
            <Text style={styles.sectionTitle}>✉️ מכתב ההתראה</Text>
            <Card style={styles.letterCard}>
              <Text style={styles.letterText}>{letter}</Text>
            </Card>

            <View style={styles.actionsRow}>
              <SecondaryButton
                title="צור מחדש"
                icon="🔄"
                onPress={generateLetter}
                loading={generating}
                fullWidth={false}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="שתף"
                icon="📤"
                onPress={handleShare}
                fullWidth={false}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { padding: SCREEN_PADDING },

  infoCard: { marginBottom: SECTION_GAP },
  infoTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: Spacing.sm },
  infoText: { ...Typography.body, color: Colors.text, textAlign: 'right', lineHeight: 24 },
  infoDisclaimer: {
    ...Typography.caption, color: Colors.muted, textAlign: 'right',
    marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border,
    lineHeight: 20,
  },

  generateSection: {
    alignItems: 'center', paddingVertical: Spacing.xl,
  },
  generateText: {
    ...Typography.body, color: Colors.muted, textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  sectionTitle: {
    ...Typography.bodyLarge, color: Colors.text, textAlign: 'right',
    marginBottom: Spacing.md,
  },

  letterCard: { marginBottom: SECTION_GAP },
  letterText: {
    ...Typography.body, color: Colors.text, textAlign: 'right',
    lineHeight: 26, writingDirection: 'rtl',
  },

  actionsRow: {
    flexDirection: 'row-reverse', gap: Spacing.sm,
  },
});
