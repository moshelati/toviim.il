import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { getClaim, updateClaimMeta } from '../../lib/claimsService';
import { getOrCreateGraph, saveGraph } from '../../graph/storage';
import { updateNode, addNode } from '../../graph/builder';
import { getPlaintiff } from '../../graph/queries';
import type { CaseGraph, PartyNode } from '../../graph/types';
import type { Claim } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'PlaintiffForm'>;

interface FormData {
  fullName: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
}

interface FormErrors {
  fullName?: string;
  idNumber?: string;
  address?: string;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = 'שם מלא הוא שדה חובה';
  }

  if (!data.idNumber.trim()) {
    errors.idNumber = 'תעודת זהות היא שדה חובה';
  } else if (!/^\d{9}$/.test(data.idNumber.trim())) {
    errors.idNumber = 'תעודת זהות חייבת להכיל 9 ספרות';
  }

  if (!data.address.trim()) {
    errors.address = 'כתובת היא שדה חובה';
  }

  return errors;
}

export function PlaintiffFormScreen({ navigation, route }: Props) {
  const { claimId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [graph, setGraph] = useState<CaseGraph | null>(null);

  const [form, setForm] = useState<FormData>({
    fullName: '',
    idNumber: '',
    address: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // ─── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const c = await getClaim(claimId);
        if (cancelled || !c) return;
        setClaim(c);

        const g = await getOrCreateGraph(c);
        if (cancelled) return;
        setGraph(g);

        // Pre-fill form from existing plaintiff node or legacy claim fields
        const plaintiff = getPlaintiff(g);
        if (plaintiff) {
          setForm({
            fullName: plaintiff.fullName || '',
            idNumber: plaintiff.idNumber || '',
            address: plaintiff.address || '',
            phone: plaintiff.phone || '',
            email: (plaintiff.meta?.email as string) || '',
          });
        } else {
          // Fallback to legacy flat fields on the claim
          setForm({
            fullName: c.plaintiffName || c.plaintiff?.fullName || '',
            idNumber: c.plaintiffId || c.plaintiff?.idNumber || '',
            address: c.plaintiffAddress || c.plaintiff?.address || '',
            phone: c.plaintiffPhone || c.plaintiff?.phone || '',
            email: '',
          });
        }
      } catch {
        Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני התביעה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [claimId]);

  // ─── Field update ───────────────────────────────────────────────────────────

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    setErrors(prev => {
      if (prev[field as keyof FormErrors]) {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      }
      return prev;
    });
  }, []);

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Validate
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!graph || !claim) return;

    setSaving(true);
    try {
      // 1. Update the Claim document with plaintiff data
      await updateClaimMeta(claimId, {
        plaintiff: {
          fullName: form.fullName.trim(),
          idNumber: form.idNumber.trim(),
          address: form.address.trim(),
          phone: form.phone.trim() || undefined,
          type: claim.plaintiff?.type ?? 'individual',
        },
        plaintiffName: form.fullName.trim(),
        plaintiffId: form.idNumber.trim(),
        plaintiffAddress: form.address.trim(),
        plaintiffPhone: form.phone.trim() || undefined,
      });

      // 2. Update the graph's plaintiff PartyNode
      const existingPlaintiff = getPlaintiff(graph);
      if (existingPlaintiff) {
        updateNode(graph, existingPlaintiff.id, {
          fullName: form.fullName.trim(),
          label: form.fullName.trim(),
          idNumber: form.idNumber.trim(),
          address: form.address.trim(),
          phone: form.phone.trim() || undefined,
          meta: {
            ...existingPlaintiff.meta,
            email: form.email.trim() || undefined,
          },
        } as Partial<PartyNode>);
      } else {
        // No plaintiff node yet — create one
        const now = Date.now();
        const newNode: PartyNode = {
          id: `party_${now}_plaintiff`,
          kind: 'party',
          role: 'plaintiff',
          label: form.fullName.trim(),
          fullName: form.fullName.trim(),
          idNumber: form.idNumber.trim(),
          address: form.address.trim(),
          phone: form.phone.trim() || undefined,
          partyType: 'individual',
          createdAt: now,
          updatedAt: now,
          meta: {
            email: form.email.trim() || undefined,
          },
        };
        addNode(graph, newNode);
      }

      await saveGraph(graph);
      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את הנתונים. נסו שוב.');
    } finally {
      setSaving(false);
    }
  }, [form, graph, claim, claimId, navigation]);

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
        title="פרטי התובע"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section title */}
          <Text style={styles.sectionTitle}>פרטי התובע/ת</Text>
          <Text style={styles.sectionSubtitle}>
            הזינו את הפרטים האישיים שיופיעו בכתב התביעה
          </Text>

          {/* שם מלא */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>שם מלא</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={form.fullName}
              onChangeText={v => updateField('fullName', v)}
              placeholder="שם פרטי ומשפחה"
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.fullName ? (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            ) : null}
          </View>

          {/* תעודת זהות */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>תעודת זהות</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={[styles.input, errors.idNumber && styles.inputError]}
              value={form.idNumber}
              onChangeText={v => updateField('idNumber', v)}
              placeholder="9 ספרות"
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              keyboardType="number-pad"
              maxLength={9}
              returnKeyType="next"
            />
            {errors.idNumber ? (
              <Text style={styles.errorText}>{errors.idNumber}</Text>
            ) : null}
          </View>

          {/* כתובת */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>כתובת</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={form.address}
              onChangeText={v => updateField('address', v)}
              placeholder="רחוב, מספר, עיר"
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              returnKeyType="next"
            />
            {errors.address ? (
              <Text style={styles.errorText}>{errors.address}</Text>
            ) : null}
          </View>

          {/* טלפון */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>טלפון</Text>
              <Text style={styles.optional}>(רשות)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={v => updateField('phone', v)}
              placeholder="050-0000000"
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          {/* דוא"ל */}
          <View style={styles.fieldWrap}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>דוא"ל</Text>
              <Text style={styles.optional}>(רשות)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={v => updateField('email', v)}
              placeholder="example@email.com"
              placeholderTextColor={Colors.gray400}
              textAlign="right"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          {/* Save button */}
          <View style={styles.buttonWrap}>
            <PrimaryButton
              title="שמירה"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: Spacing.xl,
  },

  // ─── Section ────────────────────────────────────────────────────────────
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.xl,
  },

  // ─── Field ──────────────────────────────────────────────────────────────
  fieldWrap: {
    marginBottom: Spacing.base,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  label: {
    ...Typography.body,
    color: Colors.text,
    textAlign: 'right',
  },
  required: {
    ...Typography.body,
    color: Colors.danger,
  },
  optional: {
    ...Typography.caption,
    color: Colors.muted,
  },

  // ─── Input ──────────────────────────────────────────────────────────────
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },

  // ─── Error ──────────────────────────────────────────────────────────────
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // ─── Button ─────────────────────────────────────────────────────────────
  buttonWrap: {
    marginTop: Spacing.xl,
  },
});
