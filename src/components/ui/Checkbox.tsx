import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

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
        {checked && <Text style={styles.checkmark}>✓</Text>}
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
    marginVertical: SPACING.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm - 2,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    flexShrink: 0,
  },
  checkedBox: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  labelWrap: { flex: 1 },
  label: {
    fontSize: 14,
    color: COLORS.gray[700],
    textAlign: 'right',
    lineHeight: 22,
  },
});
