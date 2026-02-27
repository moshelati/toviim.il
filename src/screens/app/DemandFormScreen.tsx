import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim, updateClaimMeta } from '../../lib/claimsService';
import { getOrCreateGraph, saveGraph } from '../../graph/storage';
import { addDemand, removeNode } from '../../graph/builder';
import { getDemands } from '../../graph/queries';
import type { CaseGraph } from '../../graph/types';
import type { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS, formatNIS } from '../../config/legal';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, SECTION_GAP } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'DemandForm'>;

interface DemandItem {
  id: string;
  description: string;
  amount: string;
}

export function DemandFormScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [demandItems, setDemandItems] = useState<DemandItem[]>([
    { id: '1', description: '', amount: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Load claim and graph ──────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [claimId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedClaim = await getClaim(claimId);
      if (!loadedClaim) {
        Alert.alert('שגיאה', 'לא נמצאה תביעה');
        navigation.goBack();
        return;
      }
      setClaim(loadedClaim);

      const loadedGraph = await getOrCreateGraph(loadedClaim);
      setGraph(loadedGraph);

      // Populate from existing graph demands
      const existingDemands = getDemands(loadedGraph);
      if (existingDemands.length > 0) {
        setDemandItems(
          existingDemands.map((d) => ({
            id: d.id,
            description: d.description,
            amount: d.amountNis != null ? String(d.amountNis) : '',
          })),
        );
      }

      // Populate total amount from claim
      const claimAmount = loadedClaim.amountClaimedNis ?? loadedClaim.amount;
      if (claimAmount && claimAmount > 0) {
        setTotalAmount(String(claimAmount));
      }
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני התביעה');
    } finally {
      setLoading(false);
    }
  }, [claimId, navigation]);

  // ─── Computed values ───────────────────────────────────────────────────────

  const parsedTotal = parseFloat(totalAmount) || 0;
  const exceedsLimit = parsedTotal > SMALL_CLAIMS_MAX_AMOUNT_NIS;

  // ─── Demand item helpers ───────────────────────────────────────────────────

  const updateDemandItem = useCallback(
    (id: string, field: 'description' | 'amount', value: string) => {
      setDemandItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  const addNewDemandItem = useCallback(() => {
    setDemandItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', amount: '' },
    ]);
  }, []);

  const removeDemandItem = useCallback((id: string) => {
    setDemandItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!graph || !claim) return;

    // Validate: at least one demand with a description
    const validItems = demandItems.filter((d) => d.description.trim());
    if (validItems.length === 0) {
      Alert.alert('שדה חסר', 'יש להוסיף לפחות דרישה אחת עם תיאור');
      return;
    }

    setSaving(true);
    try {
      // 1. Remove old demand nodes from the graph
      const oldDemands = getDemands(graph);
      for (const old of oldDemands) {
        removeNode(graph, old.id);
      }

      // 2. Add new demand nodes to the graph
      for (const item of validItems) {
        const amount = parseFloat(item.amount) || undefined;
        addDemand(graph, item.description.trim(), amount);
      }

      // 3. Save graph to Firestore
      await saveGraph(graph);

      // 4. Update claim meta with demands and total amount
      await updateClaimMeta(claimId, {
        demands: validItems.map((d) => d.description.trim()),
        amountClaimedNis: parsedTotal > 0 ? parsedTotal : undefined,
        amount: parsedTotal > 0 ? parsedTotal : undefined,
      });

      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את הדרישות. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }, [graph, claim, demandItems, parsedTotal, claimId, navigation]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="דרישות" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="דרישות" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Info badge: small claims limit ─────────────────────── */}
        <View style={styles.limitNote}>
          <Text style={styles.limitNoteText}>
            {'ℹ️ גבול תביעות קטנות: עד '}
            {formatNIS(SMALL_CLAIMS_MAX_AMOUNT_NIS)}
          </Text>
        </View>

        {/* ── Total amount ───────────────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>סכום כולל</Text>
          <Text style={styles.sectionSub}>
            הסכום הכולל שאתה תובע (בשקלים)
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencyLabel}>₪</Text>
            <TextInput
              style={styles.amountInput}
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder="0"
              placeholderTextColor={Colors.gray400}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>
          {exceedsLimit && (
            <Badge
              label={`הסכום חורג מגבול תביעות קטנות (${formatNIS(SMALL_CLAIMS_MAX_AMOUNT_NIS)})`}
              variant="danger"
              icon="⚠️"
              style={styles.warningBadge}
            />
          )}
        </Card>

        {/* ── Demand items list ───────────────────────────────────── */}
        <Text style={styles.sectionHeader}>פירוט הדרישות</Text>
        <Text style={styles.sectionHeaderSub}>
          פרט/י את כל הדרישות שלך מהנתבע
        </Text>

        {demandItems.map((item, index) => (
          <Card key={item.id} style={styles.demandCard}>
            <View style={styles.demandCardHeader}>
              <Text style={styles.demandIndex}>דרישה {index + 1}</Text>
              {demandItems.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeDemandItem(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeBtn}>הסר</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>תיאור</Text>
            <TextInput
              style={styles.textInput}
              value={item.description}
              onChangeText={(v) => updateDemandItem(item.id, 'description', v)}
              placeholder="תאר/י את הדרישה..."
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>סכום (אופציונלי)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyLabel}>₪</Text>
              <TextInput
                style={styles.amountInput}
                value={item.amount}
                onChangeText={(v) => updateDemandItem(item.id, 'amount', v)}
                placeholder="0"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
          </Card>
        ))}

        {/* ── Add demand button ───────────────────────────────────── */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={addNewDemandItem}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>הוסף דרישה</Text>
        </TouchableOpacity>

        {/* ── Save button ─────────────────────────────────────────── */}
        <PrimaryButton
          title="שמור דרישות"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: SCREEN_PADDING,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
  },

  // ── Limit note ──────────────────────────────────────────────
  limitNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: SECTION_GAP,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
  },
  limitNoteText: {
    ...Typography.small,
    color: Colors.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },

  // ── Sections ────────────────────────────────────────────────
  section: {
    marginBottom: SECTION_GAP,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  sectionHeaderSub: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.base,
  },

  // ── Amount input ────────────────────────────────────────────
  amountRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
  },
  currencyLabel: {
    ...Typography.bodyLarge,
    color: Colors.muted,
    marginLeft: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text,
    paddingVertical: Spacing.md,
    writingDirection: 'rtl',
  },

  // ── Warning badge ───────────────────────────────────────────
  warningBadge: {
    marginTop: Spacing.md,
    alignSelf: 'flex-end',
  },

  // ── Demand cards ────────────────────────────────────────────
  demandCard: {
    marginBottom: Spacing.base,
  },
  demandCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  demandIndex: {
    ...Typography.bodyLarge,
    color: Colors.primary,
  },
  removeBtn: {
    ...Typography.caption,
    color: Colors.danger,
    fontWeight: '700',
  },

  // ── Fields ──────────────────────────────────────────────────
  fieldLabel: {
    ...Typography.small,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: Spacing.base,
    writingDirection: 'rtl',
  },

  // ── Add button ──────────────────────────────────────────────
  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryLight,
    marginBottom: SECTION_GAP,
    gap: Spacing.sm,
  },
  addButtonIcon: {
    ...Typography.h3,
    color: Colors.primary,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },

  // ── Save button ─────────────────────────────────────────────
  saveButton: {
    marginTop: Spacing.sm,
  },
});
