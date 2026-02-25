import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { sendMessageToGemini, GeminiMessage } from '../../lib/gemini';
import { getClaim, appendMessage, updateClaimMeta } from '../../lib/claimsService';
import { ChatMessage } from '../../types/claim';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ClaimChat'>;

// ─── Claim-type context map ────────────────────────────────────────────────
const CLAIM_TYPE_CONTEXT: Record<string, string> = {
  consumer: 'התביעה נוגעת לצרכנות: מוצר פגום, שירות גרוע, אי-אספקה.',
  landlord: 'התביעה נוגעת לשכירות: פיקדון שלא הוחזר, נזקים בדירה, תיקונים.',
  employer: 'התביעה נוגעת לדיני עבודה: שכר לא שולם, פיצויי פיטורין, זכויות.',
  neighbor: 'התביעה נוגעת לנזקי שכנים: נזקים, מטרד רעש, חדירה לרכוש.',
  contract: 'התביעה נוגעת להפרת חוזה: הסכם שלא קוים, נזק כספי שנגרם.',
  other:    'התביעה נוגעת לסיבה אחרת שתתואר על ידי המשתמש.',
};

// ─── System prompt builder ─────────────────────────────────────────────────
function buildSystemPrompt(claimType: string, plaintiffName: string): string {
  const ctx = CLAIM_TYPE_CONTEXT[claimType] ?? '';
  return `
אני העוזר המשפטי האישי שלך לתביעות קטנות. אני כאן כדי לעזור לך לבנות את התביעה שלך.

שמי של המשתמש: ${plaintiffName}.
${ctx}

ה-AI שלי פועל לפי הכללים האלה:
1. אני שואל שאלה אחת בלבד בכל פעם — ממוקדת, ברורה, וידידותית.
2. אני מדבר בגוף ראשון, בעברית פשוטה וחמה.
3. אני מאשש ומסכם כל תשובה לפני שאלה הבאה.
4. אני מנסה להבין: מי הנתבע, מה קרה, מתי, כמה כסף, ומה הראיות.
5. אם הסכום עולה על 38,800 ₪ — אני מציין שאין מדובר בתביעה קטנה.
6. כשיש לי מספיק מידע (6-10 שאלות), אני אומר: "תודה! יש לי מספיק מידע לבנות את כתב התביעה."
7. אני מסיים כל תשובה בשאלה הבאה.

התחל בברכה קצרה ובשאלה הראשונה: מה בדיוק קרה?
  `.trim();
}

export function ClaimChatScreen({ route, navigation }: Props) {
  const { claimId, claimType } = route.params as { claimId: string; claimType: string };
  const { user } = useAuth();

  const [messages,      setMessages]      = useState<ChatMessage[]>([]);
  const [inputText,     setInputText]     = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [plaintiffName, setPlaintiffName] = useState('');
  const [claimDone,     setClaimDone]     = useState(false);
  const [initialized,   setInitialized]   = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ── Load claim & send opening message ────────────────────────────────────
  useEffect(() => {
    (async () => {
      const claim = await getClaim(claimId);
      const name  = claim?.plaintiffName ?? user?.displayName ?? 'משתמש';
      setPlaintiffName(name);

      if (claim?.messages?.length) {
        setMessages(claim.messages);
        setInitialized(true);
        return;
      }

      // Send initial greeting from AI
      setIsTyping(true);
      try {
        const systemPrompt = buildSystemPrompt(claimType, name);
        const aiText = await sendMessageToGemini(
          [{ role: 'user', parts: [{ text: 'התחל את הראיון' }] }],
          systemPrompt,
        );
        const opening: ChatMessage = { role: 'model', text: aiText, timestamp: Date.now() };
        setMessages([opening]);
        await appendMessage(claimId, [opening]);
      } catch (e) {
        const fallback: ChatMessage = {
          role: 'model',
          text: `שלום ${name}! אני כאן כדי לעזור לך לבנות את התביעה שלך.\n\nספר/י לי — מה בדיוק קרה?`,
          timestamp: Date.now(),
        };
        setMessages([fallback]);
      } finally {
        setIsTyping(false);
        setInitialized(true);
      }
    })();
  }, []);

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  // ── Send a user message ───────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInputText('');
    setIsTyping(true);

    try {
      // Convert full history to Gemini format
      const history: GeminiMessage[] = updatedMsgs.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const systemPrompt = buildSystemPrompt(claimType, plaintiffName);
      const aiText = await sendMessageToGemini(history, systemPrompt);

      const aiMsg: ChatMessage = { role: 'model', text: aiText, timestamp: Date.now() };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      await appendMessage(claimId, finalMsgs);

      // Detect claim completion signal
      if (
        aiText.includes('יש לי מספיק מידע') ||
        aiText.includes('כתב התביעה') ||
        finalMsgs.filter(m => m.role === 'user').length >= 10
      ) {
        setClaimDone(true);
        // Extract a brief summary for Firestore
        await updateClaimMeta(claimId, {
          status: 'evidence',
          summary: aiText.slice(0, 300),
        });
      }
    } catch (err: any) {
      Alert.alert('שגיאת AI', 'לא ניתן לקבל תשובה כרגע. בדוק חיבור לאינטרנט.');
      setMessages(updatedMsgs); // revert optimistic update
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, isTyping, claimId, claimType, plaintiffName]);

  // ── Render a single bubble ────────────────────────────────────────────────
  function renderBubble({ item, index }: { item: ChatMessage; index: number }) {
    const isAI   = item.role === 'model';
    const isLast = index === messages.length - 1;

    return (
      <View style={[styles.bubbleWrap, isAI ? styles.bubbleWrapAI : styles.bubbleWrapUser]}>
        {isAI && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>⚖️</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isAI ? styles.bubbleAI : styles.bubbleUser,
          isLast && styles.bubbleLast,
        ]}>
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

  // ── Completion CTA ────────────────────────────────────────────────────────
  function renderDoneBanner() {
    return (
      <View style={styles.doneBanner}>
        <Text style={styles.doneIcon}>🎉</Text>
        <Text style={styles.doneTitle}>הראיון הושלם!</Text>
        <Text style={styles.doneSub}>עכשיו ניתן להוסיף ראיות ולייצר את כתב התביעה</Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('ClaimDetail', { claimId })}
        >
          <Text style={styles.doneBtnText}>המשך ← הוסף ראיות וצור PDF</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[700]} />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary[700], COLORS.primary[600]]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>עוזר משפטי AI</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {!initialized ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
            <Text style={styles.loadingText}>מתחבר לעוזר AI...</Text>
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
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>⚖️</Text>
                    </View>
                    <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                      <Text style={styles.typingDots}>● ● ●</Text>
                    </View>
                  </View>
                )}
                {claimDone && renderDoneBanner()}
              </>
            }
          />
        )}

        {/* Input bar */}
        {!claimDone && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="כתוב/י כאן..."
              placeholderTextColor={COLORS.gray[400]}
              textAlign="right"
              multiline
              maxLength={1000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={!isTyping}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f0f5' },

  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon:     { fontSize: 20, color: COLORS.white },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'center', gap: 8 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.white },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText:   { fontSize: 14, color: COLORS.gray[500] },

  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },

  bubbleWrap:     { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end', gap: 8 },
  bubbleWrapAI:   { flexDirection: 'row-reverse' },
  bubbleWrapUser: { justifyContent: 'flex-end' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  aiAvatarText: { fontSize: 16 },

  bubble: {
    maxWidth: '78%', borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
  },
  bubbleAI:   {
    backgroundColor: COLORS.white,
    borderBottomRightRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  bubbleUser: { backgroundColor: COLORS.primary[600], borderBottomLeftRadius: 4 },
  bubbleLast: {},

  bubbleText:     { fontSize: 15, lineHeight: 24, textAlign: 'right' },
  bubbleTextAI:   { color: COLORS.gray[800] },
  bubbleTextUser: { color: COLORS.white },

  bubbleTime:    { fontSize: 10, color: COLORS.gray[400], textAlign: 'left', marginTop: 4 },
  bubbleTimeAI:  { textAlign: 'right' },

  typingBubble: { paddingVertical: SPACING.sm },
  typingDots:   { color: COLORS.gray[400], letterSpacing: 3, fontSize: 12 },

  doneBanner: {
    margin: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.lg, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary[200],
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  doneIcon:  { fontSize: 40, marginBottom: SPACING.sm },
  doneTitle: { fontSize: 20, fontWeight: '800', color: COLORS.gray[800], marginBottom: SPACING.xs },
  doneSub:   { fontSize: 14, color: COLORS.gray[500], textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 22 },
  doneBtn: {
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4,
  },
  doneBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  inputBar: {
    flexDirection: 'row-reverse', alignItems: 'flex-end',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.gray[100],
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: COLORS.gray[50], borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: 15, color: COLORS.gray[800],
    borderWidth: 1.5, borderColor: COLORS.gray[200],
  },
  sendBtn: {
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 10, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray[300] },
  sendIcon: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});
