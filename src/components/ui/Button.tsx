import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '../../theme';

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
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white}
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
    borderRadius: Radius.button,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.55 },

  // Sizes
  size_sm: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm - 2, minHeight: 36 },
  size_md: { paddingHorizontal: Spacing.xl,   paddingVertical: Spacing.sm + 4, minHeight: 48 },
  size_lg: { paddingHorizontal: Spacing.xxl,  paddingVertical: Spacing.md,     minHeight: 56 },

  // Variants
  variant_primary:   { backgroundColor: Colors.primary },
  variant_secondary: { backgroundColor: Colors.primaryLight },
  variant_outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  variant_ghost:     { backgroundColor: 'transparent' },
  variant_danger:    { backgroundColor: Colors.danger },

  // Labels
  label: { fontWeight: '600', textAlign: 'center' },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 17 },
  labelVariant_primary:   { color: Colors.white },
  labelVariant_secondary: { color: Colors.primaryDark },
  labelVariant_outline:   { color: Colors.primary },
  labelVariant_ghost:     { color: Colors.primary },
  labelVariant_danger:    { color: Colors.white },
});
