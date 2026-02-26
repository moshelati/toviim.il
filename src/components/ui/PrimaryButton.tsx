import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Radius, BUTTON_HEIGHT, Shadows, Spacing } from '../../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** Full-width (default true) */
  fullWidth?: boolean;
  /** Small size variant */
  small?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  icon,
  style,
  textStyle,
  fullWidth = true,
  small = false,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        small && styles.btnSmall,
        !fullWidth && styles.btnInline,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} size="small" />
      ) : (
        <Text style={[
          small ? styles.textSmall : styles.text,
          isDisabled && styles.textDisabled,
          textStyle,
        ]}>
          {icon ? `${icon}  ${title}` : title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
  loading,
  icon,
  style,
  textStyle,
  fullWidth = true,
  small = false,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        styles.secondary,
        small && styles.btnSmall,
        !fullWidth && styles.btnInline,
        isDisabled && styles.secondaryDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <Text style={[
          small ? styles.textSmall : styles.text,
          styles.secondaryText,
          isDisabled && styles.secondaryTextDisabled,
          textStyle,
        ]}>
          {icon ? `${icon}  ${title}` : title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function TextButton({
  title,
  onPress,
  disabled,
  icon,
  style,
  textStyle,
}: Omit<PrimaryButtonProps, 'loading' | 'fullWidth' | 'small'>) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.textBtn, style]}
    >
      <Text style={[styles.textBtnLabel, disabled && styles.textBtnDisabled, textStyle]}>
        {icon ? `${icon}  ${title}` : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: BUTTON_HEIGHT,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    ...Shadows.md,
  },
  btnSmall: {
    height: 40,
    paddingHorizontal: Spacing.base,
  },
  btnInline: {
    alignSelf: 'flex-start',
  },
  btnDisabled: {
    backgroundColor: Colors.gray300,
  },
  text: {
    ...Typography.buttonLarge,
    color: Colors.white,
  },
  textSmall: {
    ...Typography.button,
    color: Colors.white,
  },
  textDisabled: {
    color: Colors.gray500,
  },

  // Secondary
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadows.sm,
  },
  secondaryDisabled: {
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray50,
  },
  secondaryText: {
    color: Colors.primary,
  },
  secondaryTextDisabled: {
    color: Colors.gray400,
  },

  // Text button
  textBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  textBtnLabel: {
    ...Typography.button,
    color: Colors.primary,
  },
  textBtnDisabled: {
    color: Colors.gray400,
  },
});
