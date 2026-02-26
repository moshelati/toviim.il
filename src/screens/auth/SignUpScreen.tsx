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
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string,string>>({});
  const [errorSheet, setErrorSheet] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');

  function validate(): boolean {
    const e: Record<string,string> = {};
    if (!name.trim())                    e.name     = '\u05E0\u05D0 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E9\u05DD \u05DE\u05DC\u05D0';
    if (!email.includes('@'))            e.email    = '\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4';
    if (password.length < 8)             e.password = '\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05E4\u05D7\u05D5\u05EA 8 \u05EA\u05D5\u05D5\u05D9\u05DD';
    if (password !== confirm)            e.confirm  = '\u05D4\u05E1\u05D9\u05E1\u05DE\u05D0\u05D5\u05EA \u05D0\u05D9\u05E0\u05DF \u05EA\u05D5\u05D0\u05DE\u05D5\u05EA';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignUp() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
    } catch (err: any) {
      let msg = '\u05D0\u05D9\u05E8\u05E2\u05D4 \u05E9\u05D2\u05D9\u05D0\u05D4. \u05E0\u05E1\u05D4/\u05D9 \u05E9\u05D5\u05D1.';
      if (err.code === 'auth/email-already-in-use') msg = '\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05DE\u05D9\u05D9\u05DC \u05DB\u05D1\u05E8 \u05E8\u05E9\u05D5\u05DE\u05D4 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA.';
      if (err.code === 'auth/invalid-email')        msg = '\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4.';
      if (err.code === 'auth/weak-password')        msg = '\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05DC\u05E9\u05D4 \u05DE\u05D3\u05D9.';
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
        title={'\u05D9\u05E6\u05D9\u05E8\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF'}
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
          {/* Welcome text */}
          <View style={styles.welcome}>
            <View style={styles.avatarPlaceholder}>
              <Text style={{ fontSize: 30 }}>{'\uD83D\uDC64'}</Text>
            </View>
            <Text style={styles.welcomeTitle}>{'\u05D1\u05E8\u05D5\u05DB/\u05D4 \u05D4\u05D1\u05D0/\u05D4!'}</Text>
            <Text style={styles.welcomeSub}>
              {'\u05E0\u05E8\u05E9\u05DD/\u05EA \u05D1\u05D7\u05D9\u05E0\u05DD \u05D5\u05DE\u05EA\u05D7\u05D9\u05DC/\u05D4 \u05DC\u05D1\u05E0\u05D5\u05EA \u05D0\u05EA \u05D4\u05EA\u05D1\u05D9\u05E2\u05D4 \u05E9\u05DC\u05DA'}
            </Text>
          </View>

          {/* Form */}
          <Input
            label={'\u05E9\u05DD \u05DE\u05DC\u05D0'}
            placeholder={'\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9'}
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoComplete="name"
            textContentType="name"
          />
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
            placeholder={'\u05DC\u05E4\u05D7\u05D5\u05EA 8 \u05EA\u05D5\u05D5\u05D9\u05DD'}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry={!showPw}
            textContentType="newPassword"
            rightIcon={<Text style={styles.eyeIcon}>{showPw ? '\uD83D\uDE48' : '\uD83D\uDC41\uFE0F'}</Text>}
            onRightIconPress={() => setShowPw(!showPw)}
            hint={'8 \u05EA\u05D5\u05D5\u05D9\u05DD \u05DC\u05E4\u05D7\u05D5\u05EA, \u05DB\u05D5\u05DC\u05DC \u05DE\u05E1\u05E4\u05E8'}
          />
          <Input
            label={'\u05D0\u05D9\u05DE\u05D5\u05EA \u05E1\u05D9\u05E1\u05DE\u05D4'}
            placeholder={'\u05D4\u05D6\u05DF/\u05D9 \u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05D5\u05D1'}
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            secureTextEntry={!showPw}
            textContentType="newPassword"
          />

          <Button
            label={'\u05D9\u05E6\u05D9\u05E8\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF'}
            onPress={handleSignUp}
            size="lg"
            loading={loading}
            style={styles.submitBtn}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{'\u05D0\u05D5'}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              {'\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05DC\u05DA \u05D7\u05E9\u05D1\u05D5\u05DF? '}
              <Text style={styles.loginLinkAccent}>{'\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF'}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={errorSheet}
        onClose={() => setErrorSheet(false)}
        icon={'\u274C'}
        title={'\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E8\u05E9\u05DE\u05D4'}
        body={errorMsg}
        primaryLabel={'\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}
        onPrimary={() => setErrorSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.white },
  scroll:       { flex: 1 },
  scrollContent:{ padding: SCREEN_PADDING },

  welcome: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  welcomeSub: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  eyeIcon:   { fontSize: 18 },
  submitBtn: { marginTop: Spacing.sm },

  dividerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { ...Typography.caption, color: Colors.gray400 },

  loginLink: { alignItems: 'center' },
  loginLinkText: {
    ...Typography.bodyMedium,
    color: Colors.gray600,
    textAlign: 'center',
  },
  loginLinkAccent: { color: Colors.primary, fontWeight: '600' },
});
