import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const labelStyle: TextStyle[] = [
    styles.label,
    styles[`labelSize_${size}`],
    styles[`labelVariant_${variant}`],
    textStyle as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? COLORS.primary[600] : COLORS.white}
          size="small"
        />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.55 },

  // Sizes
  size_sm: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm - 2, minHeight: 36 },
  size_md: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 4, minHeight: 48 },
  size_lg: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, minHeight: 56 },

  // Variants
  variant_primary:   { backgroundColor: COLORS.primary[600] },
  variant_secondary: { backgroundColor: COLORS.primary[100] },
  variant_outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary[600] },
  variant_ghost:     { backgroundColor: 'transparent' },
  variant_danger:    { backgroundColor: COLORS.danger },

  // Labels
  label: { fontWeight: '600', textAlign: 'center' },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 17 },
  labelVariant_primary:   { color: COLORS.white },
  labelVariant_secondary: { color: COLORS.primary[700] },
  labelVariant_outline:   { color: COLORS.primary[600] },
  labelVariant_ghost:     { color: COLORS.primary[600] },
  labelVariant_danger:    { color: COLORS.white },
});
