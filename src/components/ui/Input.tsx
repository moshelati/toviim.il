import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[
        styles.container,
        focused && styles.focused,
        !!error  && styles.errored,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.gray400}
          textAlign="right"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.iconWrap}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: Spacing.md },
  label:      { ...Typography.small, fontWeight: '500', color: Colors.gray700, marginBottom: 6, textAlign: 'right' },
  container:  {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray50,
    paddingHorizontal: Spacing.base,
  },
  focused:    { borderColor: Colors.primary, backgroundColor: Colors.white },
  errored:    { borderColor: Colors.danger },
  input:      { flex: 1, ...Typography.bodyMedium, color: Colors.gray800, paddingVertical: Spacing.sm + 4, minHeight: 48 },
  iconWrap:   { marginLeft: Spacing.sm },
  error:      { ...Typography.tiny, color: Colors.danger, marginTop: 4, textAlign: 'right' },
  hint:       { ...Typography.tiny, color: Colors.gray400, marginTop: 4, textAlign: 'right' },
});
