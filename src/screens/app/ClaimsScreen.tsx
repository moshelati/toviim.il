import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { getUserClaims } from '../../lib/claimsService';
import { Claim } from '../../types/claim';
import type { TabParamList, AppStackParamList } from '../../types/navigation';
import {
  Colors, Typography, Spacing, Radius, Shadows,
  SCREEN_PADDING, SECTION_GAP,
} from '../../theme';
import { Card } from '../../components/ui/Card';
import { ProgressRing, getScoreColor } from '../../components/ui/ProgressRing';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClaimsListSkeleton } from '../../components/ui/Skeleton';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'ClaimsTab'>,
  NativeStackScreenProps<AppStackParamList>
>;

const CLAIM_TYPE_HE: Record<string, string> = {
  consumer: '\u05E6\u05E8\u05DB\u05E0\u05D5\u05EA',
  landlord: '\u05E9\u05DB\u05D9\u05E8\u05D5\u05EA',
  employer: '\u05E2\u05D1\u05D5\u05D3\u05D4',
  neighbor: '\u05E9\u05DB\u05E0\u05D9\u05DD',
  contract: '\u05D7\u05D5\u05D6\u05D4',
  other:    '\u05D0\u05D7\u05E8',
};

const CLAIM_TYPE_EMOJI: Record<string, string> = {
  consumer: '\uD83D\uDED2',
  landlord: '\uD83C\uDFE0',
  employer: '\uD83D\uDCBC',
  neighbor: '\uD83C\uDFD8\uFE0F',
  contract: '\uD83D\uDCDD',
  other:    '\u2696\uFE0F',
};

const STATUS_HE: Record<string, string> = {
  chat:     '\u05D1\u05E8\u05D0\u05D9\u05D5\u05DF',
  review:   '\u05D1\u05E2\u05E8\u05D9\u05DB\u05D4',
  evidence: '\u05E8\u05D0\u05D9\u05D5\u05EA',
  draft:    '\u05D8\u05D9\u05D5\u05D8\u05D4',
  ready:    '\u05DE\u05D5\u05DB\u05DF',
  exported: '\u05D9\u05D5\u05E6\u05D0',
  complete: '\u05D4\u05D5\u05E9\u05DC\u05DD',
};

function getStatusVariant(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'ready':
    case 'exported':
    case 'complete': return 'success';
    case 'chat':     return 'warning';
    case 'review':
    case 'evidence': return 'primary';
    default:         return 'muted';
  }
}

export function ClaimsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const loadClaims = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getUserClaims(user.uid);
      setClaims(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  // Reload claims every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadClaims();
    }, [loadClaims])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClaims();
    setRefreshing(false);
  }, [loadClaims]);

  // Filter & search
  const filtered = claims.filter(c => {
    if (filter === 'active' && !['chat', 'evidence', 'review'].includes(c.status)) return false;
    if (filter === 'done' && !['ready', 'exported', 'complete'].includes(c.status)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const typeLabel = CLAIM_TYPE_HE[c.claimType ?? ''] ?? '';
      const name = (c.plaintiffName ?? c.plaintiff?.fullName ?? '').toLowerCase();
      const defendant = (c.defendant ?? c.defendants?.[0]?.name ?? '').toLowerCase();
      if (!typeLabel.includes(q) && !name.includes(q) && !defendant.includes(q)) return false;
    }
    return true;
  });

  const activeCount = claims.filter(c => ['chat', 'evidence', 'review'].includes(c.status)).length;
  const doneCount = claims.filter(c => ['ready', 'exported', 'complete'].includes(c.status)).length;

  const navigateToClaim = (c: Claim) => {
    if (c.status === 'chat') {
      navigation.navigate('ClaimChat', { claimId: c.id, claimType: c.claimType ?? '' });
    } else {
      navigation.navigate('ClaimDetail', { claimId: c.id });
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>{'\u05D4\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E9\u05DC\u05DA'}</Text>
        <Text style={styles.headerSub}>
          {claims.length > 0
            ? `${claims.length} \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E1\u05D4\u05F4\u05DB`
            : '\u05E2\u05D3\u05D9\u05D9\u05DF \u05D0\u05D9\u05DF \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA'}
        </Text>
      </View>

      {/* Search + filters */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={'\u05D7\u05D9\u05E4\u05D5\u05E9 \u05EA\u05D1\u05D9\u05E2\u05D4...'}
            placeholderTextColor={Colors.gray400}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: `\u05D4\u05DB\u05DC (${claims.length})` },
            { key: 'active', label: `\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA (${activeCount})` },
            { key: 'done', label: `\u05D4\u05D5\u05E9\u05DC\u05DE\u05D5 (${doneCount})` },
          ] as const).map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <ClaimsListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search ? '\uD83D\uDD0D' : '\uD83D\uDCCB'}
          title={search ? '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA' : '\u05D0\u05D9\u05DF \u05EA\u05D1\u05D9\u05E2\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF'}
          subtitle={
            search
              ? '\u05E0\u05E1\u05D4 \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05DE\u05D9\u05DC\u05D5\u05EA \u05D4\u05D7\u05D9\u05E4\u05D5\u05E9'
              : '\u05D4\u05EA\u05D7\u05DC \u05EA\u05D1\u05D9\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05D5\u05D4\u05D9\u05D0 \u05EA\u05D5\u05E4\u05D9\u05E2 \u05DB\u05D0\u05DF'
          }
          actionLabel={search ? undefined : '\u05EA\u05D1\u05D9\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4'}
          onAction={search ? undefined : () => navigation.navigate('NewClaim')}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          {filtered.map(c => {
            const score = c.readinessScore ?? 0;
            const scoreColor = getScoreColor(score);
            const typeLabel = CLAIM_TYPE_HE[c.claimType ?? ''] ?? '\u05EA\u05D1\u05D9\u05E2\u05D4';
            const typeEmoji = CLAIM_TYPE_EMOJI[c.claimType ?? ''] ?? '\u2696\uFE0F';
            const statusLabel = STATUS_HE[c.status] ?? '\u05E4\u05EA\u05D5\u05D7';

            return (
              <Card key={c.id} onPress={() => navigateToClaim(c)} style={styles.claimCard}>
                <View style={styles.claimRow}>
                  <View style={[styles.claimEmoji, { backgroundColor: scoreColor + '15' }]}>
                    <Text style={styles.claimEmojiText}>{typeEmoji}</Text>
                  </View>
                  <View style={styles.claimInfo}>
                    <Text style={styles.claimTitle}>{typeLabel}</Text>
                    <Text style={styles.claimSub} numberOfLines={1}>
                      {c.plaintiffName ?? c.plaintiff?.fullName ?? ''}
                      {c.defendant || c.defendants?.[0]?.name
                        ? ` \u05E0\u05D2\u05D3 ${c.defendant || c.defendants?.[0]?.name}`
                        : ''}
                    </Text>
                    <Badge
                      label={statusLabel}
                      variant={getStatusVariant(c.status)}
                      style={{ marginTop: 4, alignSelf: 'flex-end' }}
                    />
                  </View>
                  <View style={styles.claimScoreWrap}>
                    <ProgressRing score={score} size={52} strokeWidth={4} />
                  </View>
                </View>

                {/* Amount row */}
                {(c.amountClaimedNis || c.amount) ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{'\u05E1\u05DB\u05D5\u05DD \u05EA\u05D1\u05D9\u05E2\u05D4:'}</Text>
                    <Text style={styles.amountValue}>
                      {'\u20AA'}{(c.amountClaimedNis ?? c.amount ?? 0).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => navigation.navigate('NewClaim')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },

  // Header
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'right',
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Search
  searchWrap: {
    backgroundColor: Colors.white,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    marginTop: Spacing.sm,
  },
  searchIcon: { fontSize: 16, marginLeft: Spacing.sm },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  filterChipText: {
    ...Typography.caption,
    color: Colors.muted,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Content
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING, gap: Spacing.sm },

  // Claim card
  claimCard: { marginBottom: 0 },
  claimRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  claimEmoji: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  claimEmojiText: { fontSize: 24 },
  claimInfo: { flex: 1 },
  claimTitle: { ...Typography.bodyLarge, color: Colors.text, textAlign: 'right' },
  claimSub: { ...Typography.caption, color: Colors.muted, textAlign: 'right', marginTop: 2 },
  claimScoreWrap: { alignItems: 'center' },

  amountRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  amountLabel: { ...Typography.caption, color: Colors.muted },
  amountValue: { ...Typography.bodyLarge, color: Colors.text },

  // FAB
  fab: {
    position: 'absolute',
    left: SCREEN_PADDING,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xl,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: '300',
    lineHeight: 30,
  },
});
