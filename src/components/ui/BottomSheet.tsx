import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Animated, Dimensions, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, BUTTON_HEIGHT } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  icon?: string;
  body?: string;
  /** Primary action */
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  /** Secondary action */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Tiny link at bottom */
  linkLabel?: string;
  onLink?: () => void;
  /** Custom content instead of body */
  children?: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  icon,
  body,
  primaryLabel,
  onPrimary,
  primaryLoading,
  secondaryLabel,
  onSecondary,
  linkLabel,
  onLink,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 300,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Icon */}
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}

          {/* Title */}
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {/* Body */}
          {body ? <Text style={styles.body}>{body}</Text> : null}

          {/* Custom content */}
          {children}

          {/* Primary button */}
          {primaryLabel && onPrimary ? (
            <TouchableOpacity
              onPress={onPrimary}
              disabled={primaryLoading}
              activeOpacity={0.8}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Secondary button */}
          {secondaryLabel && onSecondary ? (
            <TouchableOpacity
              onPress={onSecondary}
              activeOpacity={0.8}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Link */}
          {linkLabel && onLink ? (
            <TouchableOpacity onPress={onLink} style={styles.linkWrap}>
              <Text style={styles.linkText}>{linkLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: SCREEN_HEIGHT * 0.4,
    ...Shadows.lg,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
  },
  icon: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  primaryBtn: {
    height: BUTTON_HEIGHT,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  primaryText: {
    ...Typography.buttonLarge,
    color: Colors.white,
  },
  secondaryBtn: {
    height: BUTTON_HEIGHT,
    borderRadius: Radius.button,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  secondaryText: {
    ...Typography.buttonLarge,
    color: Colors.primary,
  },
  linkWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  linkText: {
    ...Typography.caption,
    color: Colors.muted,
    textDecorationLine: 'underline',
  },
});
