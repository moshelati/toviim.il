import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim, updateClaimMeta } from '../../lib/claimsService';
import { getOrCreateGraph, saveGraph } from '../../graph/storage';
import { addNode, removeNode, updateNode } from '../../graph/builder';
import { getEventsSorted } from '../../graph/queries';
import type { CaseGraph, EventNode } from '../../graph/types';
import type { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'TimelineForm'>;

// ─── Local draft type for events being edited ──────────────────────────────

interface EventDraft {
  /** Matches EventNode.id for existing events, or a temp id for new ones */
  id: string;
  date: string;
  description: string;
  /** Whether this event already exists in the graph */
  isNew: boolean;
}

let _tempCounter = 0;
function tempId(): string {
  _tempCounter += 1;
  return `tmp_event_${Date.now()}_${_tempCounter}`;
}

// ─── Date helpers ───────────────────────────────────────────────────────────

/** Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY display */
function isoToDisplay(iso?: string): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  // Already in DD/MM/YYYY or free text — return as-is
  return iso;
}

/** Convert DD/MM/YYYY display to ISO date for storage */
function displayToIso(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // Free text — return as-is
  return display;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TimelineFormScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const c = await getClaim(claimId);
      if (!c) return;
      setClaim(c);

      const g = await getOrCreateGraph(c);
      setGraph(g);

      // Convert existing EventNodes into drafts
      const sorted = getEventsSorted(g);
      setEvents(
        sorted.map((ev) => ({
          id: ev.id,
          date: isoToDisplay(ev.date),
          description: ev.description,
          isNew: false,
        })),
      );
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני התביעה');
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Event mutations (local state) ────────────────────────────────────────

  const addEvent = useCallback(() => {
    setEvents((prev) => [
      ...prev,
      { id: tempId(), date: '', description: '', isNew: true },
    ]);
  }, []);

  const updateEvent = useCallback(
    (id: string, field: 'date' | 'description', value: string) => {
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, [field]: value } : ev)),
      );
    },
    [],
  );

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!graph || !claim) return;

    // Validate: at least one event should have content
    const nonEmpty = events.filter((ev) => ev.date.trim() || ev.description.trim());
    if (nonEmpty.length === 0) {
      Alert.alert('שגיאה', 'יש להוסיף לפחות אירוע אחד עם תאריך או תיאור');
      return;
    }

    setSaving(true);
    try {
      // Work on a copy of the graph
      const g: CaseGraph = JSON.parse(JSON.stringify(graph));

      // 1. Remove events that were deleted from the form
      const existingEventIds = getEventsSorted(g).map((n) => n.id);
      const keptIds = new Set(events.filter((ev) => !ev.isNew).map((ev) => ev.id));
      for (const eid of existingEventIds) {
        if (!keptIds.has(eid)) {
          removeNode(g, eid);
        }
      }

      // 2. Update existing events & add new ones
      for (const ev of events) {
        const isoDate = displayToIso(ev.date);
        if (!ev.isNew) {
          updateNode(g, ev.id, {
            date: isoDate,
            description: ev.description,
            label: ev.description.slice(0, 60),
          });
        } else if (ev.date.trim() || ev.description.trim()) {
          addNode(g, {
            id: ev.id,
            kind: 'event',
            label: ev.description.slice(0, 60) || 'אירוע',
            date: isoDate,
            description: ev.description,
            category: 'other',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as EventNode);
        }
      }

      // 3. Persist graph
      await saveGraph(g);

      // 4. Also sync timeline back to the legacy claim data
      const timelineForClaim = events
        .filter((ev) => ev.date.trim() || ev.description.trim())
        .map((ev) => ({
          date: displayToIso(ev.date),
          description: ev.description,
        }));
      await updateClaimMeta(claimId, { timeline: timelineForClaim });

      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את השינויים');
    } finally {
      setSaving(false);
    }
  }, [graph, claim, events, claimId, navigation]);

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading || !claim) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <AppHeader
        title="ציר זמן"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section description */}
        <Text style={styles.description}>
          רשמו את כל האירועים החשובים בתיק, לפי סדר כרונולוגי.
          ציר הזמן עוזר לבנות את כתב התביעה בצורה ברורה ומשכנעת.
        </Text>

        {/* Events list with timeline line */}
        {events.length > 0 ? (
          <View style={styles.timelineContainer}>
            {events.map((ev, index) => (
              <View key={ev.id} style={styles.eventRow}>
                {/* Timeline visual (line + dot) */}
                <View style={styles.timelineTrack}>
                  <View style={styles.timelineDot} />
                  {index < events.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Event card */}
                <View style={styles.eventCardWrap}>
                  <Card style={styles.eventCard}>
                    {/* Date input */}
                    <Text style={styles.inputLabel}>תאריך</Text>
                    <TextInput
                      style={styles.input}
                      value={ev.date}
                      onChangeText={(val) => updateEvent(ev.id, 'date', val)}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={Colors.gray400}
                      keyboardType="numbers-and-punctuation"
                      textAlign="right"
                      maxLength={10}
                    />

                    {/* Description input */}
                    <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>מה קרה?</Text>
                    <TextInput
                      style={[styles.input, styles.inputMultiline]}
                      value={ev.description}
                      onChangeText={(val) => updateEvent(ev.id, 'description', val)}
                      placeholder="תארו את האירוע..."
                      placeholderTextColor={Colors.gray400}
                      textAlign="right"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    {/* Remove button */}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeEvent(ev.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeBtnText}>🗑️  הסר אירוע</Text>
                    </TouchableOpacity>
                  </Card>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>אין אירועים עדיין</Text>
            <Text style={styles.emptySubtitle}>
              הוסיפו את האירועים המרכזיים בתיק שלכם
            </Text>
          </View>
        )}

        {/* Add event button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={addEvent}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ הוסף אירוע</Text>
        </TouchableOpacity>

        {/* Save button */}
        <View style={styles.saveSection}>
          <PrimaryButton
            title="שמור ציר זמן"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            icon="💾"
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const TIMELINE_TRACK_WIDTH = 32;
const DOT_SIZE = 14;
const LINE_WIDTH = 2;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SCREEN_PADDING,
  },

  // ── Description ────────────────────────────────────────────────────────
  description: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: SECTION_GAP,
    lineHeight: 24,
  },

  // ── Timeline visual ───────────────────────────────────────────────────
  timelineContainer: {
    // No extra styling needed — children handle layout
  },
  eventRow: {
    flexDirection: 'row-reverse',
    marginBottom: Spacing.base,
  },
  timelineTrack: {
    width: TIMELINE_TRACK_WIDTH,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  timelineDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    zIndex: 1,
  },
  timelineLine: {
    width: LINE_WIDTH,
    flex: 1,
    backgroundColor: Colors.primaryMid,
    marginTop: -1,
    opacity: 0.4,
  },

  // ── Event card ─────────────────────────────────────────────────────────
  eventCardWrap: {
    flex: 1,
  },
  eventCard: {
    // Card already provides padding, border, shadow
  },

  // ── Form inputs ────────────────────────────────────────────────────────
  inputLabel: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  input: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },

  // ── Remove button ─────────────────────────────────────────────────────
  removeBtn: {
    alignSelf: 'flex-end',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  removeBtnText: {
    ...Typography.small,
    color: Colors.danger,
  },

  // ── Empty state ───────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'center',
  },

  // ── Add event button ──────────────────────────────────────────────────
  addBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.primaryLight + '40',
  },
  addBtnText: {
    ...Typography.button,
    color: Colors.primary,
  },

  // ── Save section ──────────────────────────────────────────────────────
  saveSection: {
    marginTop: SECTION_GAP,
  },
});
