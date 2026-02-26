import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: React.ReactNode;
  onRight?: () => void;
  /** If true, renders a purple gradient header. Default = true */
  gradient?: boolean;
  /** If true, uses light text (for gradient headers). Default = matches gradient */
  light?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRight,
  gradient = true,
  light,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const isLight = light ?? gradient;

  const content = (
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        {/* Left: Back button */}
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.iconBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.backArrow, isLight && styles.lightText]}>→</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.center}>
          <Text
            style={[styles.title, isLight && styles.lightText]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, isLight && styles.lightSubtitle]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right: Action or display-only */}
        <View style={styles.side}>
          {rightIcon && onRight ? (
            <TouchableOpacity
              onPress={onRight}
              style={styles.rightBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {rightIcon}
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={styles.rightBtn}>{rightIcon}</View>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>
      </View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient colors={Colors.gradientPurple} style={styles.gradient}>
        {content}
      </LinearGradient>
    );
  }

  return <View style={styles.flat}>{content}</View>;
}

const HEADER_CONTENT_HEIGHT = 52;

const styles = StyleSheet.create({
  gradient: {},
  flat: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  outer: {
    // paddingTop = insets.top is applied dynamically
  },
  container: {
    height: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.bodyLarge,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 1,
  },
  lightText: {
    color: Colors.white,
  },
  lightSubtitle: {
    color: 'rgba(255,255,255,0.75)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
  },
  rightBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
