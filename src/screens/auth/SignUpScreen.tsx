import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string,string>>({});

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
      // Navigation handled by AuthContext listener in RootNavigator
    } catch (err: any) {
      let msg = 'אירעה שגיאה. נסה/י שוב.';
      if (err.code === 'auth/email-already-in-use') msg = 'כתובת המייל כבר רשומה במערכת.';
      if (err.code === 'auth/invalid-email')        msg = 'כתובת מייל לא תקינה.';
      if (err.code === 'auth/weak-password')        msg = 'הסיסמה חלשה מדי.';
      Alert.alert('שגיאה בהרשמה', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>→</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>יצירת חשבון</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome text */}
          <View style={styles.welcome}>
            <View style={styles.avatarPlaceholder}>
              <Text style={{ fontSize: 30 }}>👤</Text>
            </View>
            <Text style={styles.welcomeTitle}>ברוכ/ה הבא/ה!</Text>
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
              כבר יש לך חשבון?{' '}
              <Text style={styles.loginLinkAccent}>כניסה לחשבון</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.white },
  scroll:       { flex: 1 },
  scrollContent:{ padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: COLORS.primary[600] },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[800] },

  welcome: { alignItems: 'center', paddingVertical: SPACING.xl },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: COLORS.gray[800], marginBottom: SPACING.xs },
  welcomeSub:   { fontSize: 14, color: COLORS.gray[500], textAlign: 'center', lineHeight: 22 },

  eyeIcon:   { fontSize: 18 },
  submitBtn: { marginTop: SPACING.sm },

  dividerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.gray[200] },
  dividerText: { fontSize: 13, color: COLORS.gray[400] },

  loginLink: { alignItems: 'center' },
  loginLinkText: { fontSize: 15, color: COLORS.gray[600], textAlign: 'center' },
  loginLinkAccent: { color: COLORS.primary[600], fontWeight: '600' },
});
