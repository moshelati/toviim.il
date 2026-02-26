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
    if (!email.includes('@')) e.email    = '\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4';
    if (!password)             e.password = '\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05E1\u05DE\u05D4';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      let msg = '\u05E4\u05E8\u05D8\u05D9 \u05D4\u05DB\u05E0\u05D9\u05E1\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD. \u05E0\u05E1\u05D4/\u05D9 \u05E9\u05D5\u05D1.';
      if (err.code === 'auth/user-not-found')    msg = '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D7\u05E9\u05D1\u05D5\u05DF \u05E2\u05DD \u05DE\u05D9\u05D9\u05DC \u05D6\u05D4.';
      if (err.code === 'auth/wrong-password')    msg = '\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D4.';
      if (err.code === 'auth/too-many-requests') msg = '\u05E0\u05D7\u05E1\u05DE\u05EA \u05D6\u05DE\u05E0\u05D9\u05EA \u05E2\u05E7\u05D1 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA \u05E8\u05D1\u05D9\u05DD. \u05E0\u05E1\u05D4/\u05D9 \u05E9\u05D5\u05D1 \u05DE\u05D0\u05D5\u05D7\u05E8 \u05D9\u05D5\u05EA\u05E8.';
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
        title={'\u2696\uFE0F \u05EA\u05D5\u05D1\u05D9\u05D9\u05DD.il'}
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
          <Text style={styles.title}>{'\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF'}</Text>
          <Text style={styles.subtitle}>{'\u05D1\u05E8\u05D5\u05DA/\u05D4 \u05D4\u05D1\u05D0/\u05D4 \u05D7\u05D6\u05E8\u05D4'}</Text>

          <View style={styles.formCard}>
            <Input
              label={'\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D9\u05D9\u05DC'}
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
              label={'\u05E1\u05D9\u05E1\u05DE\u05D4'}
              placeholder={'\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05DC\u05DA'}
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={!showPw}
              textContentType="password"
              rightIcon={<Text style={styles.eyeIcon}>{showPw ? '\uD83D\uDE48' : '\uD83D\uDC41\uFE0F'}</Text>}
              onRightIconPress={() => setShowPw(!showPw)}
            />

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>{'\u05E9\u05DB\u05D7\u05EA \u05E1\u05D9\u05E1\u05DE\u05D4?'}</Text>
            </TouchableOpacity>

            <Button
              label={'\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF'}
              onPress={handleLogin}
              size="lg"
              loading={loading}
              style={styles.submitBtn}
            />
          </View>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>{'\u05E2\u05D3\u05D9\u05D9\u05DF \u05D0\u05D9\u05DF \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF? '}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>{'\u05D4\u05E8\u05E9\u05DE\u05D4 \u05D7\u05D9\u05E0\u05DD'}</Text>
            </TouchableOpacity>
          </View>

          {/* Security badge */}
          <View style={styles.securityBadge}>
            <Text style={styles.securityText}>{'\uD83D\uDD12 \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7 \u05E2\u05DD Firebase Auth \u00B7 SSL \u05DE\u05D5\u05E6\u05E4\u05DF'}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={errorSheet}
        onClose={() => setErrorSheet(false)}
        icon={'\u274C'}
        title={'\u05E9\u05D2\u05D9\u05D0\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4'}
        body={errorMsg}
        primaryLabel={'\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}
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
