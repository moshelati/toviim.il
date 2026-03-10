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
    if (!name.trim())                    e.name     = 'נא להזין שם מלא';
    if (!email.includes('@'))            e.email    = 'כתובת מייל לא תקינה';
    if (password.length < 8)             e.password = 'סיסמה חייבת להיות לפחות 8 תווים';
    if (password !== confirm)            e.confirm  = 'הסיסמאות אינן תואמות';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignUp() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
    } catch (err: any) {
      let msg = 'אירעה שגיאה. נסה/י שוב.';
      if (err.code === 'auth/email-already-in-use') msg = 'כתובת המייל כבר רשומה במערכת.';
      if (err.code === 'auth/invalid-email')        msg = 'כתובת מייל לא תקינה.';
      if (err.code === 'auth/weak-password')        msg = 'הסיסמה חלשה מדי.';
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
        title="יצירת חשבון"
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
              <Text style={{ fontSize: 30 }}>👤</Text>
            </View>
            <Text style={styles.welcomeTitle}>ברוך/ה הבא/ה!</Text>
            <Text style={styles.welcomeSub}>
              נרשם/ת בחינם ומתחיל/ה לבנות את התביעה שלך
            </Text>
          </View>

          {/* Form */}
          <Input
            label="שם מלא"
            placeholder="ישראל ישראלי"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoComplete="name"
            textContentType="name"
          />
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
            placeholder="לפחות 8 תווים"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry={!showPw}
            textContentType="newPassword"
            rightIcon={<Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>}
            onRightIconPress={() => setShowPw(!showPw)}
            hint="8 תווים לפחות, כולל מספר"
          />
          <Input
            label="אימות סיסמה"
            placeholder="הזן/י סיסמה שוב"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            secureTextEntry={!showPw}
            textContentType="newPassword"
          />

          <Button
            label="יצירת חשבון"
            onPress={handleSignUp}
            size="lg"
            loading={loading}
            style={styles.submitBtn}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              כבר יש לך חשבון? {' '}
              <Text style={styles.loginLinkAccent}>כניסה לחשבון</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={errorSheet}
        onClose={() => setErrorSheet(false)}
        icon="❌"
        title="שגיאה בהרשמה"
        body={errorMsg}
        primaryLabel="נסה שוב"
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
