import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  sendMessage,
  extractStructuredData,
  buildInterviewSystemPrompt,
  AIError,
  isAIReady,
} from '../../ai';
import type { GeminiMessage } from '../../ai';
import { getClaim, appendMessage, updateClaimMeta } from '../../lib/claimsService';
import { calculateConfidence } from '../../engine/confidence';
import { ChatMessage } from '../../types/claim';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING } from '../../theme';
import { AppHeader } from '../../components/ui/AppHeader';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { PrimaryButton, SecondaryButton } from '../../components/ui/PrimaryButton';

type Props = NativeStackScreenProps<AppStackParamList, 'ClaimChat'>;

export function ClaimChatScreen({ route, navigation }: Props) {
  const { claimId, claimType } = route.params as { claimId: string; claimType: string };
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [plaintiffName, setPlaintiffName] = useState('');
  const [claimDone, setClaimDone] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Error bottom sheet state
  const [errorSheet, setErrorSheet] = useState<{
    visible: boolean;
    title: string;
    body: string;
    retryable: boolean;
  }>({ visible: false, title: '', body: '', retryable: false });

  // Failed message for retry
  const [failedMessage, setFailedMessage] = useState<ChatMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Animated typing dots
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isTyping) return;
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [isTyping]);

  // ── Show AI error as bottom sheet ──────────────────────────────────────────
  function showAIError(err: unknown) {
    if (err instanceof AIError) {
      setErrorSheet({
        visible: true,
        title: '\u26A0\uFE0F \u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05EA\u05D9 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DC-AI',
        body: err.userMessage,
        retryable: err.retryable,
      });
    } else {
      setErrorSheet({
        visible: true,
        title: '\u26A0\uFE0F \u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05EA\u05D9 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DC-AI',
        body: '\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9. \u05E0\u05E1\u05D4/\u05D9 \u05E9\u05D5\u05D1.',
        retryable: true,
      });
    }
  }

  // ── Load claim & send opening message ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const claim = await getClaim(claimId);
      const name = claim?.plaintiffName ?? user?.displayName ?? '\u05DE\u05E9\u05EA\u05DE\u05E9';
      setPlaintiffName(name);

      if (claim?.messages?.length) {
        setMessages(claim.messages);
        setInitialized(true);
        return;
      }

      // Send initial greeting from AI
      setIsTyping(true);
      try {
        const systemPrompt = buildInterviewSystemPrompt(claimType, name);
        const aiText = await sendMessage(
          [{ role: 'user', parts: [{ text: '\u05D4\u05EA\u05D7\u05DC \u05D0\u05EA \u05D4\u05E8\u05D0\u05D9\u05D5\u05DF' }] }],
          systemPrompt,
        );
        const opening: ChatMessage = { role: 'model', text: aiText, timestamp: Date.now() };
        setMessages([opening]);
        await appendMessage(claimId, [opening]);
      } catch (e) {
        const fallback: ChatMessage = {
          role: 'model',
          text: `\u05E9\u05DC\u05D5\u05DD ${name}! \u05D0\u05E0\u05D9 \u05DB\u05D0\u05DF \u05DB\u05D3\u05D9 \u05DC\u05E2\u05D6\u05D5\u05E8 \u05DC\u05DA \u05DC\u05D1\u05E0\u05D5\u05EA \u05D0\u05EA \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05E9\u05DC\u05DA.\n\n\u05E1\u05E4\u05E8/\u05D9 \u05DC\u05D9 \u2014 \u05DE\u05D4 \u05D1\u05D3\u05D9\u05D5\u05E7 \u05E7\u05E8\u05D4?`,
          timestamp: Date.now(),
        };
        setMessages([fallback]);
      } finally {
        setIsTyping(false);
        setInitialized(true);
      }
    })();
  }, []);

  // ── Scroll to bottom on new message ────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  // ── Send a user message ─────────────────────────────────────────────────────
  const handleSend = useCallback(async (retryMsg?: ChatMessage) => {
    const text = retryMsg?.text ?? inputText.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = retryMsg ?? { role: 'user', text, timestamp: Date.now() };
    const updatedMsgs = retryMsg
      ? [...messages.filter(m => m !== failedMessage), userMsg]
      : [...messages, userMsg];

    setMessages(updatedMsgs);
    setInputText('');
    setIsTyping(true);
    setFailedMessage(null);

    try {
      const history: GeminiMessage[] = updatedMsgs.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const systemPrompt = buildInterviewSystemPrompt(claimType, plaintiffName);
      const aiText = await sendMessage(history, systemPrompt);

      const aiMsg: ChatMessage = { role: 'model', text: aiText, timestamp: Date.now() };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      await appendMessage(claimId, finalMsgs);

      // Detect claim completion
      if (
        aiText.includes('\u05D9\u05E9 \u05DC\u05D9 \u05DE\u05E1\u05E4\u05D9\u05E7 \u05DE\u05D9\u05D3\u05E2') ||
        aiText.includes('\u05DB\u05EA\u05D1 \u05EA\u05D1\u05D9\u05E2\u05D4') ||
        finalMsgs.filter(m => m.role === 'user').length >= 10
      ) {
        setClaimDone(true);

        try {
          const fullHistory: GeminiMessage[] = finalMsgs.map(m => ({
            role: m.role,
            parts: [{ text: m.text }],
          }));
          const structured = await extractStructuredData(fullHistory, claimType);

          const confidence = calculateConfidence({
            plaintiffName,
            summary: structured.factsSummary,
            factsSummary: structured.factsSummary,
            defendant: structured.defendant,
            amount: structured.amount,
            timeline: structured.timeline,
            demands: structured.demands,
            hasWrittenAgreement: structured.hasWrittenAgreement,
            hasPriorNotice: structured.hasPriorNotice,
            hasProofOfPayment: structured.hasProofOfPayment,
          });

          await updateClaimMeta(claimId, {
            status: 'evidence',
            summary: structured.factsSummary || aiText.slice(0, 300),
            factsSummary: structured.factsSummary,
            timeline: structured.timeline,
            demands: structured.demands,
            defendant: structured.defendant,
            amount: structured.amount,
            hasWrittenAgreement: structured.hasWrittenAgreement,
            hasPriorNotice: structured.hasPriorNotice,
            hasProofOfPayment: structured.hasProofOfPayment,
            readinessScore: confidence.readinessScore,
            strengthScore: confidence.strengthScore,
            riskFlags: confidence.riskFlags,
            missingFields: confidence.missingFields,
            suggestions: confidence.suggestions,
          });
        } catch (extractErr) {
          console.error('Structured extraction failed:', extractErr);
          await updateClaimMeta(claimId, {
            status: 'evidence',
            summary: aiText.slice(0, 300),
          });
        }
      }
    } catch (err) {
      setFailedMessage(userMsg);
      showAIError(err);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, isTyping, claimId, claimType, plaintiffName, failedMessage]);

  // ── Render a single bubble ──────────────────────────────────────────────────
  function renderBubble({ item }: { item: ChatMessage; index: number }) {
    const isAI = item.role === 'model';
    const isFailed = item === failedMessage;

    return (
      <View style={[styles.bubbleWrap, isAI ? styles.bubbleWrapAI : styles.bubbleWrapUser]}>
        {isAI && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>{'\u2696\uFE0F'}</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isAI ? styles.bubbleAI : styles.bubbleUser,
          isFailed && styles.bubbleFailed,
        ]}>
          <Text style={[styles.bubbleText, isAI ? styles.bubbleTextAI : styles.bubbleTextUser]}>
            {item.text}
          </Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, isAI && styles.bubbleTimeAI]}>
              {new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isFailed && (
              <TouchableOpacity onPress={() => handleSend(item)} style={styles.retryBtn}>
                <Text style={styles.retryText}>{'\u21BB'} נסה שוב</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Completion CTA ──────────────────────────────────────────────────────────
  function renderDoneBanner() {
    return (
      <View style={styles.doneBanner}>
        <Text style={styles.doneIcon}>{'\uD83C\uDF89'}</Text>
        <Text style={styles.doneTitle}>הראיון הושלם!</Text>
        <Text style={styles.doneSub}>עכשיו ניתן לבדוק את ציון המוכנות, להוסיף ראיות ולייצר כתב תביעה</Text>
        <PrimaryButton
          title={'\uD83D\uDCCA בדוק ציון מוכנות'}
          onPress={() => navigation.navigate('Confidence', { claimId })}
          style={{ marginBottom: Spacing.sm }}
        />
        <SecondaryButton
          title={'\uD83D\uDCC4 המשך לכתב תביעה'}
          onPress={() => navigation.navigate('ClaimDetail', { claimId })}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <AppHeader
        title="עוזר משפטי AI"
        onBack={() => navigation.goBack()}
        rightIcon={<View style={styles.onlineDot} />}
      />

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {!initialized ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={Colors.primary} />
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
                      <Text style={styles.aiAvatarText}>{'\u2696\uFE0F'}</Text>
                    </View>
                    <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                      <View style={styles.typingRow}>
                        <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
                        <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
                        <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
                      </View>
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
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="כתוב/י כאן..."
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              multiline
              maxLength={1000}
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.8}
            >
              <Text style={styles.sendIcon}>{'\u2B06'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Error Bottom Sheet */}
      <BottomSheet
        visible={errorSheet.visible}
        onClose={() => setErrorSheet(s => ({ ...s, visible: false }))}
        title={errorSheet.title}
        body={errorSheet.body}
        primaryLabel={errorSheet.retryable ? 'נסה שוב' : undefined}
        onPrimary={errorSheet.retryable ? () => {
          setErrorSheet(s => ({ ...s, visible: false }));
          if (failedMessage) handleSend(failedMessage);
        } : undefined}
        secondaryLabel="המשך בלי AI"
        onSecondary={() => setErrorSheet(s => ({ ...s, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.base },
  loadingText: { ...Typography.small, color: Colors.muted },

  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },

  bubbleWrap: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleWrapAI: { flexDirection: 'row-reverse' },
  bubbleWrapUser: { justifyContent: 'flex-end' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  aiAvatarText: { fontSize: 16 },

  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  bubbleAI: {
    backgroundColor: Colors.white,
    borderBottomRightRadius: 4,
    ...Shadows.sm,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 4,
  },
  bubbleFailed: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger,
  },

  bubbleText: { ...Typography.bodyMedium, textAlign: 'right' },
  bubbleTextAI: { color: Colors.text },
  bubbleTextUser: { color: Colors.white },

  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bubbleTime: { ...Typography.tiny, color: Colors.gray400 },
  bubbleTimeAI: { color: Colors.gray400 },

  retryBtn: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.danger,
  },
  retryText: { ...Typography.tiny, color: Colors.white, fontWeight: '700' },

  typingBubble: { paddingVertical: Spacing.base },
  typingRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  typingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.gray400,
  },

  doneBanner: {
    margin: Spacing.base,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  doneIcon: { fontSize: 40, marginBottom: Spacing.sm },
  doneTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
  doneSub: {
    ...Typography.small, color: Colors.muted,
    textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22,
  },

  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.gray300 },
  sendIcon: { color: Colors.white, fontSize: 18, fontWeight: '700' },

  onlineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.success,
  },
});
