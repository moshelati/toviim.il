import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { sendMessageToGemini, GeminiMessage } from '../../lib/gemini';
import { getClaim } from '../../lib/claimsService';
import { Claim, ChatMessage } from '../../types/claim';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'MockTrial'>;

// ─── Roles in the mock trial ─────────────────────────────────────────────────
type TrialRole = 'judge' | 'defendant';

const ROLE_LABEL: Record<TrialRole, string> = {
  judge:     '⚖️ שופט',
  defendant: '🧑‍💼 נתבע',
};

const ROLE_COLOR: Record<TrialRole, string> = {
  judge:     COLORS.primary[700],
  defendant: '#b45309',
};

// ─── Build mock-trial system prompt ──────────────────────────────────────────
function buildMockTrialPrompt(claim: Claim, role: TrialRole): string {
  const claimSummary = claim.summary
    ?? 'פרטי התביעה לא זמינים.';

  if (role === 'judge') {
    return `
אתה שופט בבית משפט לתביעות קטנות בישראל.
שמך: כבוד השופט ישראל כהן.

פרטי התיק:
- תובע: ${claim.plaintiffName ?? 'לא ידוע'}
- סכום: ₪${claim.amount ?? '?'}
- תקציר: ${claimSummary}

תפקידך:
1. לנהל את הדיון בצורה מקצועית וענינית.
2. לשאול שאלות מחדדות את הנקודות השנויות במחלוקת.
3. לבדוק את הראיות שהוצגו.
4. לא לפסוק מיד — אלא לאסוף מידע.
5. לאחר 6-8 שאלות, לסכם ולתת "פסיקה מקדמית" עם הנמקה.
6. לדבר בגוף שלישי כשמתייחס לשופט: "בית המשפט סבור..."
7. לדבר בעברית פורמלית ותמציתית.

פתח בהכרזה רשמית ובשאלה הראשונה לתובע.
    `.trim();
  }

  // Defendant role
  return `
אתה הנתבע בתביעה קטנה.

פרטי התיק נגדך:
- תובע: ${claim.plaintiffName ?? 'לא ידוע'}
- סכום הנתבע: ₪${claim.amount ?? '?'}
- טענות התובע: ${claimSummary}

תפקידך:
1. להגן על עצמך מהטענות שנטענו נגדך.
2. להציג נרטיב חלופי סביר — אך לא בלתי-אפשרי.
3. להעלות טענות נגד (תביעה שכנגד) אם רלוונטי.
4. לא לקבל את כל הטענות, אבל גם לא לסרב לכולן.
5. לדבר בעברית פשוטה ויומיומית.

כשהמשתמש פותח בדיבור, השב כנתבע.
  `.trim();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MockTrialScreen({ route, navigation }: Props) {
  const { claimId } = route.params;
  const { user }    = useAuth();

  const flatListRef = useRef<FlatList>(null);

  const [claim,       setClaim]       = useState<Claim | null>(null);
  const [activeRole,  setActiveRole]  = useState<TrialRole>('judge');
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [inputText,   setInputText]   = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [trialOver,   setTrialOver]   = useState(false);
  const [verdict,     setVerdict]     = useState('');

  // ── Load claim & open trial ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const c = await getClaim(claimId);
      if (!c) { Alert.alert('שגיאה', 'לא נמצא התיק'); return; }
      setClaim(c);
      await startTrial(c, 'judge');
    })();
  }, []);

  async function startTrial(c: Claim, role: TrialRole) {
    setMessages([]);
    setTrialOver(false);
    setVerdict('');
    setInitialized(false);
    setIsTyping(true);
    try {
      const systemPrompt = buildMockTrialPrompt(c, role);
      const opening = await sendMessageToGemini(
        [{ role: 'user', parts: [{ text: 'פתח את הדיון' }] }],
        systemPrompt,
      );
      const openMsg: ChatMessage = { role: 'model', text: opening, timestamp: Date.now() };
      setMessages([openMsg]);
    } catch (_) {
      const fallback: ChatMessage = {
        role: 'model',
        text: role === 'judge'
          ? `בית משפט לתביעות קטנות נמצא בישיבה.\nכבוד השופט כהן מציין: פתחנו בדיון בתיק ${claim?.plaintiffName ?? ''}.\nהתובע, אנא הצג את טענותיך.`
          : `שלום, אני הנתבע. אני מוכן לשמוע את הטענות נגדי ולהגיב עליהן.`,
        timestamp: Date.now(),
      };
      setMessages([fallback]);
    } finally {
      setIsTyping(false);
      setInitialized(true);
    }
  }

  // ── Switch role ───────────────────────────────────────────────────────────
  async function handleSwitchRole(role: TrialRole) {
    if (!claim || role === activeRole) return;
    setActiveRole(role);
    await startTrial(claim, role);
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isTyping || !claim) return;
    const text = inputText.trim();

    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInputText('');
    setIsTyping(true);

    try {
      const history: GeminiMessage[] = updatedMsgs.map(m => ({
        role:  m.role,
        parts: [{ text: m.text }],
      }));
      const systemPrompt = buildMockTrialPrompt(claim, activeRole);
      const aiText = await sendMessageToGemini(history, systemPrompt);

      const aiMsg: ChatMessage = { role: 'model', text: aiText, timestamp: Date.now() };
      setMessages([...updatedMsgs, aiMsg]);

      // Detect verdict
      if (
        aiText.includes('פסק דין') ||
        aiText.includes('פסיקה') ||
        aiText.includes('מקבל את התביעה') ||
        aiText.includes('דוחה את התביעה') ||
        updatedMsgs.filter(m => m.role === 'user').length >= 8
      ) {
        setTrialOver(true);
        setVerdict(aiText);
      }
    } catch (_) {
      Alert.alert('שגיאת AI', 'לא ניתן לקבל תשובה. בדוק חיבור.');
      setMessages(updatedMsgs);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, isTyping, claim, activeRole]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  // ── Render bubble ─────────────────────────────────────────────────────────
  function renderBubble({ item }: { item: ChatMessage }) {
    const isAI = item.role === 'model';
    return (
      <View style={[styles.bubbleWrap, isAI ? styles.bubbleWrapAI : styles.bubbleWrapUser]}>
        {isAI && (
          <View style={[styles.avatar, { backgroundColor: ROLE_COLOR[activeRole] + '22' }]}>
            <Text style={styles.avatarText}>{activeRole === 'judge' ? '⚖️' : '🧑‍💼'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleUser]}>
          {isAI && (
            <Text style={[styles.roleLabel, { color: ROLE_COLOR[activeRole] }]}>
              {ROLE_LABEL[activeRole]}
            </Text>
          )}
          <Text style={[styles.bubbleText, isAI ? styles.bubbleTextAI : styles.bubbleTextUser]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, isAI && styles.bubbleTimeAI]}>
            {new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }

  // ── Verdict banner ────────────────────────────────────────────────────────
  function renderVerdict() {
    return (
      <View style={styles.verdictBanner}>
        <Text style={styles.verdictIcon}>⚖️</Text>
        <Text style={styles.verdictTitle}>הדיון הסתיים</Text>
        <Text style={styles.verdictSub}>
          {activeRole === 'judge'
            ? 'קיבלת פסיקה מקדמית מה-AI. השתמש בה לחיזוק הטיעונים שלך בדיון האמיתי.'
            : 'תרגלת מול הנתבע. עכשיו תוכל לחזור לתביעה ולחדד את הטיעונים שלך.'}
        </Text>
        <View style={styles.verdictActions}>
          <TouchableOpacity
            style={styles.verdictBtn}
            onPress={() => startTrial(claim!, activeRole)}
          >
            <Text style={styles.verdictBtnText}>🔄 דיון חדש</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.verdictBtn, styles.verdictBtnSecondary]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.verdictBtnTextSecondary}>← חזור לתביעה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[900]} />

      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.primary[900], COLORS.primary[700]]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>מוק-טריאל AI</Text>
          <Text style={styles.headerSub}>תרגול דיון משפטי</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* ── Role selector ── */}
      <View style={styles.roleBar}>
        <Text style={styles.roleBarLabel}>שוחח עם:</Text>
        {(['judge', 'defendant'] as TrialRole[]).map(role => (
          <TouchableOpacity
            key={role}
            style={[styles.roleChip, activeRole === role && styles.roleChipActive]}
            onPress={() => handleSwitchRole(role)}
          >
            <Text style={[styles.roleChipText, activeRole === role && styles.roleChipTextActive]}>
              {ROLE_LABEL[role]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Chat ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {!initialized ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
            <Text style={styles.loadingText}>פותח את הדיון...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderBubble}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              <>
                {isTyping && (
                  <View style={[styles.bubbleWrap, styles.bubbleWrapAI]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{activeRole === 'judge' ? '⚖️' : '🧑‍💼'}</Text>
                    </View>
                    <View style={[styles.bubble, styles.bubbleAI]}>
                      <Text style={styles.typingDots}>● ● ●</Text>
                    </View>
                  </View>
                )}
                {trialOver && renderVerdict()}
              </>
            }
          />
        )}

        {/* Input bar */}
        {!trialOver && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="הצג את הטיעון שלך..."
              placeholderTextColor={COLORS.gray[400]}
              textAlign="right"
              multiline
              maxLength={800}
              editable={!isTyping && initialized}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isTyping}
            >
              <Text style={styles.sendIcon}>שלח</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f0f5' },

  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon:     { fontSize: 20, color: COLORS.white },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.white },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  roleBar: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  roleBarLabel:    { fontSize: 12, color: COLORS.gray[500], fontWeight: '600' },
  roleChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.gray[300],
  },
  roleChipActive:     { backgroundColor: COLORS.primary[600], borderColor: COLORS.primary[600] },
  roleChipText:       { fontSize: 13, fontWeight: '700', color: COLORS.gray[600] },
  roleChipTextActive: { color: COLORS.white },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText:   { fontSize: 14, color: COLORS.gray[500] },

  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },

  bubbleWrap:     { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end', gap: 8 },
  bubbleWrapAI:   { flexDirection: 'row-reverse' },
  bubbleWrapUser: { justifyContent: 'flex-end' },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 16 },

  bubble: {
    maxWidth: '78%', borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
  },
  bubbleAI: {
    backgroundColor: COLORS.white, borderBottomRightRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 1,
  },
  bubbleUser: { backgroundColor: COLORS.primary[600], borderBottomLeftRadius: 4 },

  roleLabel:     { fontSize: 10, fontWeight: '800', marginBottom: 4, textAlign: 'right' },
  bubbleText:    { fontSize: 14, lineHeight: 22, textAlign: 'right' },
  bubbleTextAI:  { color: COLORS.gray[800] },
  bubbleTextUser:{ color: COLORS.white },
  bubbleTime:    { fontSize: 10, color: COLORS.gray[400], textAlign: 'left', marginTop: 4 },
  bubbleTimeAI:  { textAlign: 'right' },

  typingDots: { color: COLORS.gray[400], letterSpacing: 3, fontSize: 12 },

  verdictBanner: {
    margin: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.lg, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary[200],
  },
  verdictIcon:  { fontSize: 44, marginBottom: SPACING.sm },
  verdictTitle: { fontSize: 20, fontWeight: '800', color: COLORS.gray[800], marginBottom: SPACING.xs },
  verdictSub: {
    fontSize: 13, color: COLORS.gray[500], textAlign: 'center',
    lineHeight: 22, marginBottom: SPACING.lg,
  },
  verdictActions: { flexDirection: 'row-reverse', gap: SPACING.sm, width: '100%' },
  verdictBtn: {
    flex: 1, backgroundColor: COLORS.primary[600], borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4, alignItems: 'center',
  },
  verdictBtnSecondary: { backgroundColor: COLORS.gray[100] },
  verdictBtnText:          { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  verdictBtnTextSecondary: { color: COLORS.gray[700], fontWeight: '700', fontSize: 14 },

  inputBar: {
    flexDirection: 'row-reverse', alignItems: 'flex-end',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.gray[100], gap: SPACING.sm,
  },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: COLORS.gray[50], borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: 14, color: COLORS.gray[800],
    borderWidth: 1.5, borderColor: COLORS.gray[200],
  },
  sendBtn: {
    backgroundColor: COLORS.primary[700], borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 10, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray[300] },
  sendIcon: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});
