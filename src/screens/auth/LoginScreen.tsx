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
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string,string>>({});

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
      if (err.code === 'auth/user-not-found')  msg = 'לא נמצא חשבון עם מייל זה.';
      if (err.code === 'auth/wrong-password')  msg = 'הסיסמה שגויה.';
      if (err.code === 'auth/too-many-requests') msg = 'נחסמת זמנית עקב ניסיונות רבים. נסה/י שוב מאוחר יותר.';
      Alert.alert('שגיאת כניסה', msg);
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
        {/* Header with purple accent */}
        <LinearGradient
          colors={[COLORS.primary[600], COLORS.primary[500]]}
          style={styles.topBanner}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>→</Text>
          </TouchableOpacity>
          <Text style={styles.logoText}>⚖️ תוביים.il</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.gray[50] },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  topBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md + 4,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: COLORS.white },
  logoText: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  title:    { fontSize: 28, fontWeight: '800', color: COLORS.gray[800], textAlign: 'right', marginTop: SPACING.lg },
  subtitle: { fontSize: 15, color: COLORS.gray[500], textAlign: 'right', marginBottom: SPACING.xl },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: SPACING.lg,
  },

  eyeIcon:   { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-start', marginTop: -SPACING.xs, marginBottom: SPACING.md },
  forgotText:{ fontSize: 13, color: COLORS.primary[600], fontWeight: '500' },
  submitBtn: { marginTop: SPACING.xs },

  signupRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  signupText: { fontSize: 14, color: COLORS.gray[500] },
  signupLink: { fontSize: 14, color: COLORS.primary[600], fontWeight: '700' },

  securityBadge: {
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    borderRadius: RADIUS.md,
  },
  securityText: { fontSize: 12, color: COLORS.gray[500] },
});
