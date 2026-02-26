import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows, CARD_PADDING } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** If provided, card becomes pressable */
  onPress?: () => void;
  /** Remove padding */
  noPadding?: boolean;
}

export function Card({ children, style, onPress, noPadding }: CardProps) {
  const cardStyle = [styles.card, noPadding && styles.noPadding, style];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

/** A small 2-column tile (icon, title, subtitle) */
interface TileProps {
  emoji: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Tile({ emoji, title, subtitle, onPress, style, disabled }: TileProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.tile, disabled && styles.tileDisabled, style]}
    >
      <View style={styles.tileIcon}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? (
        <Text style={styles.tileSub} numberOfLines={2}>{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: CARD_PADDING,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  noPadding: {
    padding: 0,
  },

  /* Tile */
  tile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: CARD_PADDING,
    minHeight: 110,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  tileEmoji: {
    fontSize: 20,
  },
  tileTitle: {
    ...Typography.bodyLarge,
    color: Colors.text,
    textAlign: 'right',
  },
  tileSub: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 2,
    textAlign: 'right',
  },
});
