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

const TERMS_SECTIONS = [
  {
    title: '1. הגדרות',
    body: '"האפליקציה" - אפליקציית toviim.il, עוזר AI לתביעות קטנות.\n"המשתמש" - כל אדם המשתמש באפליקציה.\n"השירות" - כלל השירותים המוצעים באפליקציה, כולל ראיון AI, יצירת כתב תביעה, ומוק-טריאל.',
  },
  {
    title: '2. מהות השירות',
    body: 'האפליקציה מספקת כלי עזר טכנולוגי לארגון מידע לצורך הגשת תביעות קטנות בישראל. השירות אינו מהווה ייעוץ משפטי ואינו מחליף עורך דין. המשתמש אחראי באופן בלעדי לנכונות המידע שהוא מזין ולהחלטותיו המשפטיות.',
  },
  {
    title: '3. שימוש בבינה מלאכותית (AI)',
    body: 'האפליקציה משתמשת בטכנולוגיית AI (בינה מלאכותית) לצורך ראיון, ארגון מידע, ויצירת מסמכים. תוצרי ה-AI עשויים להכיל שגיאות ואינם מהווים חוות דעת משפטית. המשתמש מתחייב לבדוק כל מסמך שנוצר לפני הגשתו לבית המשפט.',
  },
  {
    title: '4. הגבלת אחריות',
    body: 'האפליקציה ומפעיליה אינם אחראים לכל נזק ישיר או עקיף שעלול להיגרם כתוצאה משימוש בשירות, כולל אך לא מוגבל לתוצאות הליכים משפטיים, אובדן כספי, או כל נזק אחר. השימוש באפליקציה הוא על אחריות המשתמש בלבד.',
  },
  {
    title: '5. פרטיות ואבטחת מידע',
    body: 'מידע אישי שנמסר על ידי המשתמש נשמר באופן מאובטח בשרתי Firebase של Google. המידע לא יועבר לצד שלישי ללא הסכמת המשתמש, למעט כנדרש על פי דין. פרטים נוספים במדיניות הפרטיות.',
  },
  {
    title: '6. מגבלת תביעות קטנות',
    body: 'השירות מיועד לתביעות קטנות בלבד, בסכום של עד 39,900 ₪ (נכון לשנת 2025). תביעות בסכומים גבוהים יותר יש להגיש בבית משפט שלום בליווי עורך דין.',
  },
  {
    title: '7. קניין רוחני',
    body: 'כל הזכויות באפליקציה, כולל עיצוב, קוד, טקסט ולוגו, שמורות למפעילי האפליקציה. המסמכים שנוצרים עבור המשתמש שייכים למשתמש.',
  },
  {
    title: '8. שינויים בתנאי השימוש',
    body: 'מפעילי האפליקציה שומרים לעצמם את הזכות לעדכן תנאים אלה מעת לעת. שימוש מתמשך באפליקציה מהווה הסכמה לתנאים המעודכנים.',
  },
  {
    title: '9. דין חל וסמכות שיפוט',
    body: 'על תנאי שימוש אלה יחולו דיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז תל אביב.',
  },
  {
    title: '10. יצירת קשר',
    body: 'לכל שאלה או בעיה הקשורה לשירות, ניתן לפנות אלינו באמצעות האפליקציה.',
  },
];

export function TermsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="תנאי שימוש"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBanner}>
          <Text style={styles.topBannerIcon}>📋</Text>
          <Text style={styles.topBannerTitle}>תנאי שימוש - toviim.il</Text>
          <Text style={styles.topBannerDate}>עדכון אחרון: פברואר 2026</Text>
        </View>

        {TERMS_SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            בשימוש באפליקציה אתה/את מאשר/ת שקראת והבנת תנאים אלה.
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
