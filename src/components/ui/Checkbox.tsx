import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string | React.ReactNode;
}

export function Checkbox({ checked, onToggle, label }: CheckboxProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.box, checked && styles.checkedBox]}>
        {checked && <Text style={styles.checkmark}>{'\u2713'}</Text>}
      </View>
      <View style={styles.labelWrap}>
        {typeof label === 'string' ? (
          <Text style={styles.label}>{label}</Text>
        ) : label}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginVertical: Spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm - 2,
    borderWidth: 2,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  checkedBox: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  labelWrap: { flex: 1 },
  label: {
    ...Typography.small,
    color: Colors.gray700,
    textAlign: 'right',
    lineHeight: 22,
  },
});
