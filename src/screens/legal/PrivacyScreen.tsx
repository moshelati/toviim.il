import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../components/ui/AppHeader';
import { Colors, Typography, Spacing, Radius, SCREEN_PADDING } from '../../theme';

const PRIVACY_SECTIONS = [
  {
    title: '1. מידע שאנחנו אוספים',
    body: 'אנחנו אוספים את המידע הבא:\n\n• פרטים אישיים: שם מלא, כתובת מייל, מספר טלפון, מספר תעודת זהות (לצורך כתב התביעה בלבד).\n• מידע על התביעה: פרטי האירוע, סכום, ראיות, ותכתובות עם ה-AI.\n• נתוני שימוש: זמני כניסה, סוג מכשיר, ופעולות באפליקציה.',
  },
  {
    title: '2. שימוש במידע',
    body: 'המידע שנאסף משמש אך ורק לצורך:\n\n• מתן השירות (ראיון AI, יצירת כתב תביעה, מוק-טריאל)\n• שיפור השירות והחוויה\n• תקשורת עם המשתמש בנוגע לשירות\n• עמידה בדרישות חוקיות',
  },
  {
    title: '3. אחסון המידע',
    body: 'המידע נשמר בשרתי Firebase של Google באופן מוצפן. השרתים ממוקמים באיחוד האירופי ובארצות הברית ועומדים בתקני אבטחה מחמירים (SOC 2, ISO 27001).',
  },
  {
    title: '4. שיתוף מידע עם צדדים שלישיים',
    body: 'איננו מוכרים, משכירים או משתפים מידע אישי עם צדדים שלישיים, למעט:\n\n• ספקי שירות טכנולוגיים (Google Firebase, Google AI) לצורך תפעול השירות\n• במקרים הנדרשים על פי דין או צו בית משפט\n\nשירות ה-AI (Google Gemini) מקבל את תוכן הראיון לצורך עיבוד, בהתאם למדיניות הפרטיות של Google.',
  },
  {
    title: '5. אבטחת מידע',
    body: 'אנחנו נוקטים באמצעי אבטחה סבירים להגנה על המידע, כולל:\n\n• הצפנה בתעבורה (TLS/SSL)\n• אימות דו-שלבי לגישה למערכות\n• הרשאות גישה מוגבלות\n• גיבוי מוצפן',
  },
  {
    title: '6. זכויות המשתמש',
    body: 'בהתאם לחוק הגנת הפרטיות, יש לך זכות:\n\n• לעיין במידע שנאסף עליך\n• לבקש תיקון מידע שגוי\n• לבקש מחיקת המידע שלך\n• להתנגד לעיבוד המידע\n\nלמימוש זכויות אלה, פנה/י אלינו דרך האפליקציה.',
  },
  {
    title: '7. עוגיות (Cookies)',
    body: 'האפליקציה עשויה להשתמש באחסון מקומי (AsyncStorage) לצורך שמירת העדפות ומצב הכניסה. אין שימוש בעוגיות למעקב שיווקי.',
  },
  {
    title: '8. שינויים במדיניות',
    body: 'מדיניות זו עשויה להתעדכן מעת לעת. שינויים מהותיים יובאו לידיעת המשתמשים באמצעות האפליקציה.',
  },
  {
    title: '9. יצירת קשר',
    body: 'לכל שאלה בנוגע לפרטיות, ניתן לפנות אלינו באמצעות האפליקציה.',
  },
];

export function PrivacyScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="מדיניות פרטיות"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBanner}>
          <Text style={styles.topBannerIcon}>🔒</Text>
          <Text style={styles.topBannerTitle}>מדיניות פרטיות - toviim.il</Text>
          <Text style={styles.topBannerDate}>עדכון אחרון: פברואר 2026</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>בקצרה</Text>
          <Text style={styles.summaryText}>
            🔐 המידע שלך מוצפן ומאובטח{'\n'}🚫 לא מוכרים מידע לצדדים שלישיים{'\n'}✅ יש לך זכות לעיין, לתקן ולמחוק{'\n'}☁️ מאוחסן בשרתי Google Firebase
          </Text>
        </View>

        {PRIVACY_SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            בשימוש באפליקציה אתה/את מסכים/ה למדיניות פרטיות זו.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING },

  topBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primaryMid + '30',
  },
  topBannerIcon: { fontSize: 36, marginBottom: Spacing.sm },
  topBannerTitle: { ...Typography.h3, color: Colors.primaryDark, textAlign: 'center' },
  topBannerDate: { ...Typography.tiny, color: Colors.primary, marginTop: Spacing.xs },

  summaryCard: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  summaryTitle: {
    ...Typography.body, fontWeight: '700', color: Colors.success,
    textAlign: 'right', marginBottom: Spacing.sm,
  },
  summaryText: {
    ...Typography.small, color: Colors.success, textAlign: 'right', lineHeight: 26,
  },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.body, fontWeight: '700', color: Colors.text,
    textAlign: 'right', marginBottom: Spacing.xs,
  },
  sectionBody: {
    ...Typography.small, color: Colors.gray600, textAlign: 'right',
    lineHeight: 24,
  },

  footer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  footerText: {
    ...Typography.caption, color: Colors.muted, textAlign: 'center', lineHeight: 20,
  },
});
