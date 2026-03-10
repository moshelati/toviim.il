import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { sendMessage, AIError } from '../../ai';
import type { GeminiMessage } from '../../ai';
import { getClaim } from '../../lib/claimsService';
import { getOrCreateGraph } from '../../graph/storage';
import {
  getPlaintiff, getDefendants, getDemands, getEvents,
  getEvidence, getTotalAmount,
  getUncoveredEvents, hasPriorNotice,
} from '../../graph/queries';
import { scoreGraph } from '../../engine/graphScoring';
import type { CaseGraph } from '../../graph/types';
import { Claim, ChatMessage } from '../../types/claim';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING } from '../../theme';
import { AppHeader } from '../../components/ui/AppHeader';

type Props = NativeStackScreenProps<AppStackParamList, 'MockTrial'>;

// ─── Roles in the mock trial ─────────────────────────────────────────────────
type TrialRole = 'judge' | 'defendant';

const ROLE_LABEL: Record<TrialRole, string> = {
  judge:     '⚖️ שופט',
  defendant: '🧑‍💼 נתבע',
};

const ROLE_COLOR: Record<TrialRole, string> = {
  judge:     Colors.primary,
  defendant: '#b45309',
};

// ─── Build mock-trial system prompt (graph-enhanced) ─────────────────────────
function buildTrialPrompt(claim: Claim, graph: CaseGraph | null, role: TrialRole): string {
  // Graph-based data (preferred) with fallback to flat claim
  const plaintiff = graph ? getPlaintiff(graph) : null;
  const defendants = graph ? getDefendants(graph) : [];
  const demands = graph ? getDemands(graph) : [];
  const events = graph ? getEvents(graph) : [];
  const evidence = graph ? getEvidence(graph) : [];
  const totalAmount = graph ? getTotalAmount(graph) : (claim.amountClaimedNis || claim.amount || 0);
  const priorNotice = graph ? hasPriorNotice(graph) : !!claim.hasPriorNotice;
  const uncoveredEvents = graph ? getUncoveredEvents(graph) : [];
  const scores = graph ? scoreGraph(graph) : null;

  const plaintiffName = plaintiff?.fullName || claim.plaintiffName || claim.plaintiff?.fullName || 'לא ידוע';
  const defendantName = defendants[0]?.fullName || claim.defendant || claim.defendants?.[0]?.name || 'לא ידוע';
  const claimSummary = claim.factsSummary || claim.summary || 'פרטי התביעה לא זמינים.';

  // Build rich timeline from graph events
  const timelineText = events.length > 0
    ? events.map(e => `${e.date || '?'}: ${e.description || e.label}`).join('\n')
    : claim.timeline?.map(e => `${e.date}: ${e.description}`).join('\n') || '';

  // Build demands text from graph
  const demandsText = demands.length > 0
    ? demands.map(d => `- ${d.description || d.label}${d.amountNis ? ` (${d.amountNis.toLocaleString('he-IL')} ₪)` : ''}`).join('\n')
    : claim.demands?.join(', ') || '';

  // Evidence summary for richer context
  const evidenceSummary = evidence.length > 0
    ? `נמצאו ${evidence.length} ראיות. ${uncoveredEvents.length > 0 ? `${uncoveredEvents.length} אירועים ללא ראיה תומכת.` : 'כל האירועים מגובים בראיות.'}`
    : 'אין ראיות מצורפות לתביעה.';

  // Strength assessment
  const strengthText = scores
    ? `ציון מוכנות: ${scores.readinessScore}%, כיסוי ראיות: ${scores.evidenceCoverage}%`
    : '';

  if (role === 'judge') {
    return `
אתה שופט בבית משפט לתביעות קטנות בישראל.
שמך: כבוד השופט ישראל כהן.
חשוב: אתה לא עורך דין ולא מספק ייעוץ משפטי. זהו סימולציה לצורך תרגול בלבד.

פרטי התיק:
- תובע: ${plaintiffName}
- נתבע: ${defendantName}
- סכום: ₪${typeof totalAmount === 'number' ? totalAmount.toLocaleString('he-IL') : totalAmount}
- תקציר: ${claimSummary}
${demandsText ? `- סעדים מבוקשים:\n${demandsText}` : ''}
${timelineText ? `- ציר זמן:\n${timelineText}` : ''}
- הודעה מוקדמת: ${priorNotice ? 'נשלחה' : 'לא נשלחה'}
- מצב ראיות: ${evidenceSummary}
${strengthText ? `- הערכה: ${strengthText}` : ''}

תפקידך:
1. לנהל את הדיון בצורה מקצועית וענינית.
2. לשאול שאלות מחדדות את הנקודות השנויות במחלוקת.
3. לבדוק את הראיות שהוצגו.
4. לא לפסוק מיד — אלא לאסוף מידע.
5. לאחר 6-8 שאלות, לסכם ולתת "פסיקה מקדמית" עם הנמקה.
6. לדבר בגוף שלישי כשמתייחס לשופט: "בית המשפט סבור..."
7. לדבר בעברית פורמלית ותמציתית.
${uncoveredEvents.length > 0 ? `8. שים לב: ${uncoveredEvents.length} אירועים בתיק חסרים ראיות — שאל על כך.` : ''}
${!priorNotice ? '9. שאל על כך שלא נשלחה הודעה מוקדמת לנתבע.' : ''}

פתח בהכרזה רשמית ובשאלה הראשונה לתובע.
    `.trim();
  }

  // Defendant role
  return `
אתה הנתבע בתביעה קטנה.
חשוב: אתה לא עורך דין ולא מספק ייעוץ משפטי. זהו סימולציה לצורך תרגול בלבד.

פרטי התיק נגדך:
- תובע: ${plaintiffName}
- אתה (הנתבע): ${defendantName}
- סכום הנתבע: ₪${typeof totalAmount === 'number' ? totalAmount.toLocaleString('he-IL') : totalAmount}
- טענות התובע: ${claimSummary}
${demandsText ? `- סעדים מבוקשים:\n${demandsText}` : ''}
- מצב ראיות של התובע: ${evidenceSummary}

תפקידך:
1. להגן על עצמך מהטענות שנטענו נגדך.
2. להציג נרטיב חלופי סביר — אך לא בלתי-אפשרי.
3. להעלות טענות נגד (תביעה שכנגד) אם רלוונטי.
4. לא לקבל את כל הטענות, אבל גם לא לסרב לכולן.
5. לדבר בעברית פשוטה ויומיומית.
${uncoveredEvents.length > 0 ? `6. נצל את העובדה שיש ${uncoveredEvents.length} אירועים ללא ראיות — תקוף נקודות חלשות.` : ''}

כשהמשתמש פותח בדיבור, השב כנתבע.
  `.trim();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MockTrialScreen({ route, navigation }: Props) {
  const { claimId } = route.params;
  const { user }    = useAuth();

  const flatListRef = useRef<FlatList>(null);

  const [claim,       setClaim]       = useState<Claim | null>(null);
  const [graph,       setGraph]       = useState<CaseGraph | null>(null);
  const [activeRole,  setActiveRole]  = useState<TrialRole>('judge');
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [inputText,   setInputText]   = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [trialOver,   setTrialOver]   = useState(false);
  const [verdict,     setVerdict]     = useState('');

  // ── Load claim & graph, then open trial ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const c = await getClaim(claimId);
      if (!c) { Alert.alert('שגיאה', 'לא נמצא התיק'); return; }
      setClaim(c);

      // Load graph for richer context
      try {
        const g = await getOrCreateGraph(c);
        setGraph(g);
        await startTrial(c, g, 'judge');
      } catch {
        await startTrial(c, null, 'judge');
      }
    })();
  }, []);

  async function startTrial(c: Claim, g: CaseGraph | null, role: TrialRole) {
    setMessages([]);
    setTrialOver(false);
    setVerdict('');
    setInitialized(false);
    setIsTyping(true);
    try {
      const systemPrompt = buildTrialPrompt(c, g, role);
      const opening = await sendMessage(
        [{ role: 'user', parts: [{ text: 'פתח את הדיון' }] }],
        systemPrompt,
      );
      const openMsg: ChatMessage = { role: 'model', text: opening, timestamp: Date.now() };
      setMessages([openMsg]);
    } catch (_) {
      const fallback: ChatMessage = {
        role: 'model',
        text: role === 'judge'
          ? `בית משפט לתביעות קטנות נמצא בישיבה.\nכבוד השופט כהן מציין: פתחנו בדיון בתיק ${c.plaintiffName ?? ''}.\nהתובע, אנא הצג את טענותיך.`
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
    await startTrial(claim, graph, role);
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
      const systemPrompt = buildTrialPrompt(claim, graph, activeRole);
      const aiText = await sendMessage(history, systemPrompt);

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
  }, [inputText, messages, isTyping, claim, graph, activeRole]);

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
            onPress={() => startTrial(claim!, graph, activeRole)}
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
    <View style={styles.safe}>
      <AppHeader
        title="מוק-טריאל AI"
        subtitle="תרגול דיון משפטי"
        onBack={() => navigation.goBack()}
      />

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
            <ActivityIndicator size="large" color={Colors.primary} />
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
              placeholderTextColor={Colors.gray400}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  roleBar: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: SCREEN_PADDING, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  roleBarLabel: { ...Typography.caption, color: Colors.muted, fontWeight: '600' },
  roleChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.gray300,
  },
  roleChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleChipText:       { ...Typography.caption, fontWeight: '700', color: Colors.gray600 },
  roleChipTextActive: { color: Colors.white },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.base },
  loadingText:   { ...Typography.small, color: Colors.muted },

  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: Spacing.base, paddingBottom: Spacing.sm },

  bubbleWrap:     { flexDirection: 'row', marginBottom: Spacing.sm, alignItems: 'flex-end', gap: 8 },
  bubbleWrapAI:   { flexDirection: 'row-reverse' },
  bubbleWrapUser: { justifyContent: 'flex-end' },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 16 },

  bubble: {
    maxWidth: '78%', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
  },
  bubbleAI: {
    backgroundColor: Colors.white, borderBottomRightRadius: 4,
    ...Shadows.sm,
  },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomLeftRadius: 4 },

  roleLabel:     { ...Typography.tiny, fontWeight: '800', marginBottom: 4, textAlign: 'right' },
  bubbleText:    { ...Typography.small, lineHeight: 22, textAlign: 'right' },
  bubbleTextAI:  { color: Colors.text },
  bubbleTextUser:{ color: Colors.white },
  bubbleTime:    { ...Typography.tiny, color: Colors.gray400, textAlign: 'left', marginTop: 4 },
  bubbleTimeAI:  { textAlign: 'right' },

  typingDots: { color: Colors.gray400, letterSpacing: 3, fontSize: 12 },

  verdictBanner: {
    margin: Spacing.base, backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.md,
  },
  verdictIcon:  { fontSize: 44, marginBottom: Spacing.sm },
  verdictTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
  verdictSub: {
    ...Typography.caption, color: Colors.muted, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.xl,
  },
  verdictActions: { flexDirection: 'row-reverse', gap: Spacing.sm, width: '100%' },
  verdictBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.button,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  verdictBtnSecondary: { backgroundColor: Colors.gray100 },
  verdictBtnText:          { ...Typography.button, color: Colors.white },
  verdictBtnTextSecondary: { ...Typography.button, color: Colors.text },

  inputBar: {
    flexDirection: 'row-reverse', alignItems: 'flex-end',
    paddingHorizontal: SCREEN_PADDING, paddingVertical: Spacing.sm,
    paddingBottom: Spacing.base, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm,
  },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    ...Typography.small, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.gray300 },
  sendIcon: { color: Colors.white, fontWeight: '700', fontSize: 18 },
});
