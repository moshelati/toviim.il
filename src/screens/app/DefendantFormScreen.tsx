import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim, updateClaimMeta } from '../../lib/claimsService';
import { getOrCreateGraph, saveGraph } from '../../graph/storage';
import { updateNode, addNode, removeNode } from '../../graph/builder';
import { getDefendants } from '../../graph/queries';
import type { CaseGraph, PartyNode } from '../../graph/types';
import type { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'DefendantForm'>;

// ─── Local form state for a single defendant ─────────────────────────────────

interface DefendantForm {
  /** Matches an existing PartyNode.id, or empty for new entries */
  nodeId: string;
  name: string;
  idOrCompanyNumber: string;
  address: string;
  phone: string;
}

function emptyDefendant(): DefendantForm {
  return { nodeId: '', name: '', idOrCompanyNumber: '', address: '', phone: '' };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function DefendantFormScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [defendants, setDefendants] = useState<DefendantForm[]>([emptyDefendant()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const c = await getClaim(claimId);
        if (!c) return;
        setClaim(c);

        const g = await getOrCreateGraph(c);
        setGraph(g);

        // Hydrate form from existing graph defendants
        const existing = getDefendants(g);
        if (existing.length > 0) {
          setDefendants(
            existing.map((p) => ({
              nodeId: p.id,
              name: p.fullName ?? '',
              idOrCompanyNumber: p.idNumber ?? '',
              address: p.address ?? '',
              phone: p.phone ?? '',
            })),
          );
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId]);

  // ─── Form helpers ───────────────────────────────────────────────────────────

  const updateField = useCallback(
    (index: number, field: keyof DefendantForm, value: string) => {
      setDefendants((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const addDefendant = useCallback(() => {
    setDefendants((prev) => [...prev, emptyDefendant()]);
  }, []);

  const removeDefendant = useCallback((index: number) => {
    setDefendants((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    for (let i = 0; i < defendants.length; i++) {
      const d = defendants[i];
      if (!d.name.trim()) {
        Alert.alert('שגיאה', `נא להזין שם נתבע (נתבע ${i + 1})`);
        return false;
      }
      if (!d.address.trim()) {
        Alert.alert('שגיאה', `נא להזין כתובת (נתבע ${i + 1})`);
        return false;
      }
    }
    return true;
  }

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!graph || !claim) return;
    if (!validate()) return;

    setSaving(true);
    try {
      // 1. Work on a mutable copy of the graph
      const g = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] };

      // Remove all existing defendant nodes from the graph
      const oldDefendants = getDefendants(g);
      for (const old of oldDefendants) {
        removeNode(g, old.id);
      }

      // Add fresh defendant party nodes
      const now = Date.now();
      for (const d of defendants) {
        const node: PartyNode = {
          id: d.nodeId || `party_${now}_${Math.random().toString(36).slice(2, 8)}`,
          kind: 'party',
          label: d.name.trim(),
          role: 'defendant',
          fullName: d.name.trim(),
          idNumber: d.idOrCompanyNumber.trim() || undefined,
          phone: d.phone.trim() || undefined,
          address: d.address.trim(),
          partyType: 'individual',
          createdAt: now,
          updatedAt: now,
        };
        addNode(g, node);
      }

      // 2. Persist graph to Firestore
      await saveGraph(g);

      // 3. Persist defendants array on the Claim document
      await updateClaimMeta(claimId, {
        defendants: defendants.map((d) => ({
          name: d.name.trim(),
          address: d.address.trim(),
          phone: d.phone.trim() || undefined,
          type: 'individual',
        })),
      });

      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את הפרטים. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }, [graph, claim, defendants, claimId, navigation]);

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <AppHeader
        title="פרטי נתבע"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>נתבעים בתיק</Text>
          <Text style={styles.sectionSub}>
            הוסף את פרטי הנתבע/ים. שדות המסומנים ב-* הם חובה.
          </Text>

          {defendants.map((d, index) => (
            <Card key={index} style={styles.defendantCard}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  נתבע {index + 1}
                </Text>
                {defendants.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeDefendant(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeBtn}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Name — required */}
              <Text style={styles.label}>שם הנתבע/חברה *</Text>
              <TextInput
                style={styles.input}
                value={d.name}
                onChangeText={(v) => updateField(index, 'name', v)}
                placeholder="למשל: חברת אלפא בע״מ"
                placeholderTextColor={Colors.gray400}
                textAlign="right"
              />

              {/* ID / Company number — optional */}
              <Text style={styles.label}>ת.ז/ח.פ</Text>
              <TextInput
                style={styles.input}
                value={d.idOrCompanyNumber}
                onChangeText={(v) => updateField(index, 'idOrCompanyNumber', v)}
                placeholder="אם ידוע"
                placeholderTextColor={Colors.gray400}
                textAlign="right"
                keyboardType="number-pad"
              />

              {/* Address — required */}
              <Text style={styles.label}>כתובת *</Text>
              <TextInput
                style={styles.input}
                value={d.address}
                onChangeText={(v) => updateField(index, 'address', v)}
                placeholder="כתובת מלאה לצורך המצאה"
                placeholderTextColor={Colors.gray400}
                textAlign="right"
              />

              {/* Phone — optional */}
              <Text style={styles.label}>טלפון</Text>
              <TextInput
                style={styles.input}
                value={d.phone}
                onChangeText={(v) => updateField(index, 'phone', v)}
                placeholder="מספר טלפון"
                placeholderTextColor={Colors.gray400}
                textAlign="right"
                keyboardType="phone-pad"
              />
            </Card>
          ))}

          {/* Add defendant button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={addDefendant}
            activeOpacity={0.75}
          >
            <Text style={styles.addBtnText}>+ הוסף נתבע</Text>
          </TouchableOpacity>

          {/* Save */}
          <PrimaryButton
            title="שמור"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={{ marginTop: SECTION_GAP }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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

  // Section header
  sectionTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },

  // Defendant card
  defendantCard: {
    marginBottom: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
  },
  removeBtn: {
    fontSize: 20,
  },

  // Form fields
  label: {
    ...Typography.small,
    color: Colors.gray700,
    textAlign: 'right',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    textAlign: 'right',
  },

  // Add button
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  addBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.primary,
  },
});
