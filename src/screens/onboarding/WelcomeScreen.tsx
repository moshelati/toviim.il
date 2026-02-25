import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  I18nManager,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING } from '../../constants/theme';

// Force RTL layout
I18nManager.forceRTL(true);

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

export function WelcomeScreen({ navigation }: Props) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true, delay: 100 }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[700]} />

      <LinearGradient
        colors={[COLORS.primary[700], COLORS.primary[500], '#a78bfa']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Logo / Icon */}
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
              { icon: '📄', text: 'יצירת כתב תביעה אוטומטי' },
              { icon: '🎯', text: 'הכנה לדיון עם סימולציית בית משפט' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureText}>{f.text}</Text>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
            ))}
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttons}>
            <Button
              label="התחל עכשיו - זה חינם"
              onPress={() => navigation.navigate('Disclaimer')}
              size="lg"
              style={styles.btnPrimary}
              textStyle={{ color: COLORS.primary[700], fontWeight: '700' }}
            />
            <Button
              label="כבר יש לי חשבון"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              size="lg"
              style={styles.btnSecondary}
              textStyle={{ color: COLORS.white }}
            />
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
  container: { flex: 1, backgroundColor: COLORS.primary[700] },
  gradient:  { ...StyleSheet.absoluteFillObject },

  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleTop: {
    width: width * 1.2,
    height: width * 1.2,
    top: -width * 0.5,
    left: -width * 0.1,
  },
  circleBottom: {
    width: width * 0.9,
    height: width * 0.9,
    bottom: -width * 0.4,
    right: -width * 0.3,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },

  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoEmoji: { fontSize: 40 },

  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 26,
  },

  features: {
    width: '100%',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureIcon: { fontSize: 22 },
  featureText: { fontSize: 15, color: COLORS.white, fontWeight: '500', flex: 1, textAlign: 'right' },

  buttons: { width: '100%', gap: SPACING.sm },
  btnPrimary: {
    backgroundColor: COLORS.white,
  },
  btnSecondary: {
    borderColor: 'rgba(255,255,255,0.6)',
  },

  disclaimer: {
    marginTop: SPACING.md,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
