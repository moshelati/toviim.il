import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim } from '../../lib/claimsService';
import { getOrCreateGraph, saveGraph } from '../../graph/storage';
import { addEdge, removeEdge } from '../../graph/builder';
import {
  getEvents, getDemands, getEvidence,
  getUncoveredEvents, getUnlinkedEvidence,
} from '../../graph/queries';
import type { CaseGraph, EventNode, DemandNode, EvidenceNode, GraphEdge } from '../../graph/types';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'EvidenceLinking'>;

export function EvidenceLinkingScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const claim = await getClaim(claimId);
      if (!claim) return;
      const g = await getOrCreateGraph(claim);
      setGraph(g);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [claimId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLink = useCallback(async (evidenceId: string, targetId: string, kind: 'supports' | 'undermines') => {
    if (!graph) return;
    const updated = addEdge(graph, {
      id: `e_${Date.now()}`,
      source: evidenceId,
      target: targetId,
      kind,
    });
    setGraph(updated);
  }, [graph]);

  const handleUnlink = useCallback(async (edgeId: string) => {
    if (!graph) return;
    const updated = removeEdge(graph, edgeId);
    setGraph(updated);
  }, [graph]);

  const handleSave = useCallback(async () => {
    if (!graph) return;
    setSaving(true);
    try {
      await saveGraph(graph);
      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור. נסה שוב.');
    }
    finally { setSaving(false); }
  }, [graph, navigation]);

  if (loading || !graph) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const evidence = getEvidence(graph);
  const events = getEvents(graph);
  const demands = getDemands(graph);
  const uncoveredEvents = getUncoveredEvents(graph);
  const unlinkedEvidence = getUnlinkedEvidence(graph);

  // Find which events/demands an evidence node is linked to
  const getLinksForEvidence = (evidenceId: string): GraphEdge[] => {
    return graph.edges.filter(e => e.source === evidenceId && (e.kind === 'supports' || e.kind === 'undermines'));
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="קישור ראיות"
        subtitle={`${evidence.length} ראיות · ${events.length} אירועים`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status overview */}
        <View style={styles.statusRow}>
          <Badge
            label={`${unlinkedEvidence.length} ראיות לא מקושרות`}
            variant={unlinkedEvidence.length > 0 ? 'warning' : 'success'}
          />
          <Badge
            label={`${uncoveredEvents.length} אירועים ללא ראיה`}
            variant={uncoveredEvents.length > 0 ? 'warning' : 'success'}
          />
        </View>

        {/* Evidence list */}
        <Text style={styles.sectionTitle}>📎 ראיות</Text>
        {evidence.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>אין ראיות עדיין. הוסף ראיות דרך הראיון עם ה-AI.</Text>
          </Card>
        ) : (
          evidence.map((ev) => {
            const isSelected = selectedEvidence === ev.id;
            const links = getLinksForEvidence(ev.id);

            return (
              <Card
                key={ev.id}
                style={[styles.evidenceCard, isSelected && styles.evidenceCardSelected]}
                onPress={() => setSelectedEvidence(isSelected ? null : ev.id)}
              >
                <View style={styles.evidenceRow}>
                  <Text style={styles.evidenceEmoji}>
                    {ev.data.fileType === 'image' ? '🖼️' :
                     ev.data.fileType === 'pdf' ? '📄' :
                     ev.data.fileType === 'document' ? '📝' : '📎'}
                  </Text>
                  <View style={styles.evidenceInfo}>
                    <Text style={styles.evidenceTitle}>{ev.data.description || 'ראיה'}</Text>
                    {links.length > 0 && (
                      <Text style={styles.evidenceLinks}>
                        מקושר ל-{links.length} פריטים
                      </Text>
                    )}
                  </View>
                  <Badge
                    label={links.length > 0 ? 'מקושר' : 'לא מקושר'}
                    variant={links.length > 0 ? 'success' : 'muted'}
                  />
                </View>

                {/* Expanded: show linking options */}
                {isSelected && (
                  <View style={styles.linkSection}>
                    <Text style={styles.linkTitle}>קשר ראיה לאירוע:</Text>
                    {events.map((event) => {
                      const existingLink = links.find(l => l.target === event.id);
                      return (
                        <TouchableOpacity
                          key={event.id}
                          style={[styles.linkOption, existingLink && styles.linkOptionActive]}
                          onPress={() => {
                            if (existingLink) {
                              handleUnlink(existingLink.id);
                            } else {
                              handleLink(ev.id, event.id, 'supports');
                            }
                          }}
                        >
                          <Text style={styles.linkOptionEmoji}>
                            {existingLink ? '✅' : '⬜'}
                          </Text>
                          <Text style={styles.linkOptionText}>
                            {event.data.date ? `${event.data.date} — ` : ''}
                            {event.data.description?.slice(0, 50) || 'אירוע'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {demands.length > 0 && (
                      <>
                        <Text style={[styles.linkTitle, { marginTop: Spacing.md }]}>קשר ראיה לדרישה:</Text>
                        {demands.map((demand) => {
                          const existingLink = links.find(l => l.target === demand.id);
                          return (
                            <TouchableOpacity
                              key={demand.id}
                              style={[styles.linkOption, existingLink && styles.linkOptionActive]}
                              onPress={() => {
                                if (existingLink) {
                                  handleUnlink(existingLink.id);
                                } else {
                                  handleLink(ev.id, demand.id, 'supports');
                                }
                              }}
                            >
                              <Text style={styles.linkOptionEmoji}>
                                {existingLink ? '✅' : '⬜'}
                              </Text>
                              <Text style={styles.linkOptionText}>
                                {demand.data.description?.slice(0, 50) || 'דרישה'}
                                {demand.data.amount ? ` (${demand.data.amount.toLocaleString('he-IL')} ₪)` : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}

        {/* Uncovered events warning */}
        {uncoveredEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⚠️ אירועים ללא ראיה תומכת</Text>
            {uncoveredEvents.map((event) => (
              <Card key={event.id} style={styles.warningCard}>
                <Text style={styles.warningText}>
                  📅 {event.data.date ? `${event.data.date} — ` : ''}
                  {event.data.description || 'אירוע לא מתואר'}
                </Text>
                <Text style={styles.warningHint}>
                  מומלץ לצרף ראיה שתומכת באירוע זה
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.base }]}>
        <PrimaryButton
          title="שמור קישורים"
          icon="💾"
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { padding: SCREEN_PADDING },

  statusRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginBottom: SECTION_GAP,
    flexWrap: 'wrap',
  },

  sectionTitle: {
    ...Typography.bodyLarge, color: Colors.text, textAlign: 'right',
    marginBottom: Spacing.md, marginTop: Spacing.sm,
  },

  emptyCard: { marginBottom: SECTION_GAP },
  emptyText: { ...Typography.body, color: Colors.muted, textAlign: 'center' },

  evidenceCard: { marginBottom: Spacing.sm },
  evidenceCardSelected: { borderWidth: 2, borderColor: Colors.primary },
  evidenceRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md,
  },
  evidenceEmoji: { fontSize: 24 },
  evidenceInfo: { flex: 1 },
  evidenceTitle: { ...Typography.bodyMedium, color: Colors.text, textAlign: 'right' },
  evidenceLinks: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },

  linkSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  linkTitle: {
    ...Typography.caption, color: Colors.text, fontWeight: '700',
    textAlign: 'right', marginBottom: Spacing.sm,
  },
  linkOption: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm, marginBottom: 4,
  },
  linkOptionActive: { backgroundColor: Colors.primaryLight },
  linkOptionEmoji: { fontSize: 16 },
  linkOptionText: { ...Typography.small, color: Colors.text, flex: 1, textAlign: 'right' },

  warningCard: { marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#f59e0b20' },
  warningText: { ...Typography.bodyMedium, color: Colors.text, textAlign: 'right' },
  warningHint: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 4 },

  footer: {
    padding: SCREEN_PADDING,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
});
