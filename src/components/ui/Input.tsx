import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

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
          placeholderTextColor={COLORS.gray[400]}
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
  wrapper:    { marginBottom: SPACING.md },
  label:      { fontSize: 14, fontWeight: '500', color: COLORS.gray[700], marginBottom: 6, textAlign: 'right' },
  container:  {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
  },
  focused:    { borderColor: COLORS.primary[500], backgroundColor: COLORS.white },
  errored:    { borderColor: COLORS.danger },
  input:      { flex: 1, fontSize: 15, color: COLORS.gray[800], paddingVertical: SPACING.sm + 4, minHeight: 48 },
  iconWrap:   { marginLeft: SPACING.sm },
  error:      { fontSize: 12, color: COLORS.danger, marginTop: 4, textAlign: 'right' },
  hint:       { fontSize: 12, color: COLORS.gray[400], marginTop: 4, textAlign: 'right' },
});
