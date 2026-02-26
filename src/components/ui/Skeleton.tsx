import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, SCREEN_PADDING, CARD_PADDING } from '../../theme';

/* ── Base shimmer block ──────────────────────────────────────────── */

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.gray200,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/* ── Pre-built skeleton layouts ──────────────────────────────────── */

/** Skeleton mimicking a claim card in the list */
export function ClaimCardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.cardRow}>
        <Skeleton width={48} height={48} borderRadius={Radius.md} />
        <View style={skStyles.cardInfo}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={52} height={52} borderRadius={26} />
      </View>
    </View>
  );
}

/** Skeleton for the Home screen hero + greeting */
export function HomeSkeleton() {
  return (
    <View style={skStyles.homeWrap}>
      {/* Greeting */}
      <View style={skStyles.greetingWrap}>
        <Skeleton width="55%" height={28} borderRadius={8} />
        <Skeleton width="35%" height={18} borderRadius={6} style={{ marginTop: 8 }} />
      </View>

      {/* Hero card */}
      <Skeleton
        width="100%"
        height={180}
        borderRadius={Radius.xl}
        style={{ marginBottom: 24 }}
      />

      {/* Claims section header */}
      <Skeleton width="40%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />

      {/* Claim cards */}
      <ClaimCardSkeleton />
      <ClaimCardSkeleton />

      {/* Tiles section */}
      <Skeleton width="35%" height={18} borderRadius={6} style={{ marginTop: 16, marginBottom: 12 }} />
      <View style={skStyles.tileRow}>
        <Skeleton width="48%" height={110} borderRadius={Radius.lg} />
        <Skeleton width="48%" height={110} borderRadius={Radius.lg} />
      </View>
    </View>
  );
}

/** Skeleton for the Claims list screen */
export function ClaimsListSkeleton() {
  return (
    <View style={skStyles.claimsWrap}>
      {/* Search bar */}
      <Skeleton width="100%" height={44} borderRadius={Radius.md} style={{ marginBottom: 12 }} />

      {/* Filter chips */}
      <View style={skStyles.chipRow}>
        <Skeleton width={80} height={30} borderRadius={Radius.full} />
        <Skeleton width={90} height={30} borderRadius={Radius.full} />
        <Skeleton width={95} height={30} borderRadius={Radius.full} />
      </View>

      {/* Cards */}
      <ClaimCardSkeleton />
      <ClaimCardSkeleton />
      <ClaimCardSkeleton />
      <ClaimCardSkeleton />
    </View>
  );
}

const skStyles = StyleSheet.create({
  // Card skeleton
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: CARD_PADDING,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardInfo: { flex: 1 },

  // Home skeleton
  homeWrap: {
    padding: SCREEN_PADDING,
  },
  greetingWrap: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },

  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Claims skeleton
  claimsWrap: {
    padding: SCREEN_PADDING,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
});
