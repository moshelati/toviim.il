import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AppHeader } from '../../components/ui/AppHeader';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string,string>>({});
  const [errorSheet, setErrorSheet] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');

  function validate(): boolean {
    const e: Record<string,string> = {};
    if (!email.includes('@')) e.email    = 'כתובת מייל לא תקינה';
    if (!password)             e.password = 'נא להזין סיסמה';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      let msg = 'פרטי הכניסה שגויים. נסה/י שוב.';
      if (err.code === 'auth/user-not-found')    msg = 'לא נמצא חשבון עם מייל זה.';
      if (err.code === 'auth/wrong-password')    msg = 'הסיסמה שגויה.';
      if (err.code === 'auth/too-many-requests') msg = 'נחסמת זמנית עקב ניסיונות רבים. נסה/י שוב מאוחר יותר.';
      setErrorMsg(msg);
      setErrorSheet(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="⚖️ תוביים.il"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>כניסה לחשבון</Text>
          <Text style={styles.subtitle}>ברוך/ה הבא/ה חזרה</Text>

          <View style={styles.formCard}>
            <Input
              label="כתובת מייל"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              label="סיסמה"
              placeholder="הסיסמה שלך"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={!showPw}
              textContentType="password"
              rightIcon={<Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>}
              onRightIconPress={() => setShowPw(!showPw)}
            />

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>שכחת סיסמה?</Text>
            </TouchableOpacity>

            <Button
              label="כניסה לחשבון"
              onPress={handleLogin}
              size="lg"
              loading={loading}
              style={styles.submitBtn}
            />
          </View>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>עדיין אין לך חשבון? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>הרשמה חינם</Text>
            </TouchableOpacity>
          </View>

          {/* Security badge */}
          <View style={styles.securityBadge}>
            <Text style={styles.securityText}>🔒 מאובטח עם Firebase Auth · SSL מוצפן</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={errorSheet}
        onClose={() => setErrorSheet(false)}
        icon="❌"
        title="שגיאת כניסה"
        body={errorMsg}
        primaryLabel="נסה שוב"
        onPrimary={() => setErrorSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll:    { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING },

  title: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'right',
    marginTop: Spacing.xl,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.muted,
    textAlign: 'right',
    marginBottom: Spacing.xl,
  },

  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },

  eyeIcon:   { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-start', marginTop: -Spacing.xs, marginBottom: Spacing.md },
  forgotText:{ ...Typography.caption, color: Colors.primary, fontWeight: '500' },
  submitBtn: { marginTop: Spacing.xs },

  signupRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  signupText: { ...Typography.small, color: Colors.muted },
  signupLink: { ...Typography.small, color: Colors.primary, fontWeight: '700' },

  securityBadge: {
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
  },
  securityText: { ...Typography.tiny, color: Colors.muted },
});
