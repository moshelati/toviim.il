import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  StatusBar, I18nManager, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING, BUTTON_HEIGHT } from '../../theme';

I18nManager.forceRTL(true);

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;
const { width } = Dimensions.get('window');

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true, delay: 100 }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={Colors.gradientHero}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>⚖️</Text>
          </View>

          {/* Headline */}
          <Text style={styles.title}>תוביים.il</Text>
          <Text style={styles.subtitle}>
            העוזר המשפטי החכם שלך{'\n'}לתביעות קטנות
          </Text>

          {/* Features */}
          <View style={styles.features}>
            {[
              { icon: '🤖', text: 'ראיון AI אישי לבניית התיק שלך' },
              { icon: '📊', text: 'ציון מוכנות וניתוח חוזק התביעה' },
              { icon: '📄', text: 'יצירת כתב תביעה (טופס 1) אוטומטי' },
              { icon: '⚖️', text: 'הכנה לדיון עם סימולציית שופט AI' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Disclaimer')}
            >
              <Text style={styles.btnPrimaryText}>התחל עכשיו — זה חינם</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.btnSecondaryText}>כבר יש לי חשבון</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            אין צורך בכרטיס אשראי · 100% חינם
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDark },
  gradient: { ...StyleSheet.absoluteFillObject },

  circle: {
    position: 'absolute', borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleTop: {
    width: width * 1.2, height: width * 1.2,
    top: -width * 0.5, left: -width * 0.1,
  },
  circleBottom: {
    width: width * 0.9, height: width * 0.9,
    bottom: -width * 0.4, right: -width * 0.3,
  },

  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: SCREEN_PADDING },

  logoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  logoEmoji: { fontSize: 40 },

  title: {
    ...Typography.h1,
    fontSize: 36,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 26,
    fontWeight: '500',
  },

  features: {
    width: '100%',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: { fontSize: 22 },
  featureText: {
    ...Typography.bodyMedium,
    color: Colors.white,
    flex: 1,
    textAlign: 'right',
  },

  buttons: { width: '100%', gap: Spacing.sm },
  btnPrimary: {
    height: BUTTON_HEIGHT,
    backgroundColor: Colors.white,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    ...Typography.buttonLarge,
    color: Colors.primaryDark,
  },
  btnSecondary: {
    height: BUTTON_HEIGHT,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    ...Typography.buttonLarge,
    color: Colors.white,
  },

  disclaimer: {
    ...Typography.tiny,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: Spacing.base,
  },
});
