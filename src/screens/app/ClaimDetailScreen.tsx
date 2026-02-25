import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ScrollView, Image, ActivityIndicator,
  Alert, TextInput, Platform, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { getClaim, addEvidence, updateClaimMeta } from '../../lib/claimsService';
import { uploadEvidence, uploadSignature } from '../../lib/evidenceService';
import { Claim, Evidence } from '../../types/claim';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

// Conditional import for SignatureCanvas (not available on web)
let SignatureCanvas: any = null;
if (Platform.OS !== 'web') {
  try {
    SignatureCanvas = require('react-native-signature-canvas').default;
  } catch (_) {}
}

type Props = NativeStackScreenProps<AppStackParamList, 'ClaimDetail'>;
type Tab = 'evidence' | 'signature' | 'pdf';

const CLAIM_TYPE_HE: Record<string, string> = {
  consumer: 'צרכנות',
  landlord: 'שכירות',
  employer: 'עבודה',
  neighbor: 'שכנים',
  contract: 'חוזה',
  other:    'אחר',
};

// ─── Hebrew PDF Template (Form 1 - Israeli Small Claims) ──────────────────────
function buildPdfHtml(params: {
  plaintiffName:     string;
  plaintiffId:       string;
  plaintiffPhone:    string;
  plaintiffAddress:  string;
  defendant:         string;
  defendantAddress:  string;
  amount:            string;
  claimType:         string;
  summary:           string;
  evidenceList:      string[];
  signatureUrl:      string;
  date:              string;
  courtLocation:     string;
}): string {
  const evidenceItems = params.evidenceList.length > 0
    ? params.evidenceList.map((e, i) => `<li>${i + 1}. ${e}</li>`).join('')
    : '<li>לא הועלו ראיות</li>';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>כתב תביעה - טופס 1</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      direction: rtl;
      font-size: 13px;
      line-height: 1.7;
      color: #111;
      padding: 30px 40px;
      background: #fff;
    }
    .court-header {
      text-align: center;
      border: 3px double #000;
      padding: 12px 20px;
      margin-bottom: 20px;
    }
    .court-header h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    .court-header h2 { font-size: 16px; font-weight: bold; }
    .court-header p  { font-size: 12px; margin-top: 6px; color: #444; }
    .section {
      border: 1px solid #555;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid #aaa;
      padding-bottom: 6px;
      margin-bottom: 10px;
      color: #6d28d9;
    }
    .field-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .field-label { font-weight: bold; min-width: 120px; font-size: 12px; }
    .field-value {
      flex: 1;
      border-bottom: 1px solid #999;
      padding-bottom: 2px;
      min-width: 150px;
      font-size: 13px;
    }
    .amount-box {
      background: #f5f3ff;
      border: 2px solid #7c3aed;
      border-radius: 6px;
      padding: 10px 16px;
      display: inline-block;
      margin: 8px 0;
    }
    .amount-box span { font-size: 22px; font-weight: bold; color: #6d28d9; }
    .summary-text {
      background: #f9fafb;
      border-right: 3px solid #7c3aed;
      padding: 10px 14px;
      font-size: 13px;
      line-height: 1.8;
      border-radius: 0 4px 4px 0;
      white-space: pre-wrap;
    }
    .evidence-list { padding-right: 16px; }
    .evidence-list li { margin-bottom: 4px; font-size: 13px; }
    .signature-section {
      margin-top: 20px;
      border-top: 1px dashed #aaa;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-box { text-align: center; }
    .signature-box .label { font-size: 11px; color: #666; margin-bottom: 6px; }
    .sig-img { border: 1px solid #ccc; padding: 4px; border-radius: 4px; }
    .sig-line { border-bottom: 1px solid #333; width: 180px; margin-bottom: 4px; min-height: 50px; }
    .date-box { text-align: center; }
    .court-stamp {
      border: 2px dashed #aaa;
      border-radius: 50%;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 9px;
      color: #888;
      padding: 10px;
    }
    .footer {
      margin-top: 24px;
      font-size: 10px;
      color: #888;
      text-align: center;
      border-top: 1px solid #eee;
      padding-top: 8px;
    }
    @media print {
      body { padding: 15mm 20mm; }
    }
  </style>
</head>
<body>

  <div class="court-header">
    <h1>בית משפט לתביעות קטנות</h1>
    <h2>כתב תביעה — טופס 1</h2>
    <p>לפי חוק בית משפט לתביעות קטנות, תשל"ו–1976</p>
    <p style="font-size:11px; color:#777;">הוגש ב: ${params.courtLocation || 'בית משפט שלום'} &nbsp;|&nbsp; תאריך: ${params.date}</p>
  </div>

  <!-- PLAINTIFF -->
  <div class="section">
    <div class="section-title">פרטי התובע</div>
    <div class="field-row">
      <span class="field-label">שם מלא:</span>
      <span class="field-value">${params.plaintiffName}</span>
      <span class="field-label">מס' ת.ז.:</span>
      <span class="field-value">${params.plaintiffId}</span>
    </div>
    <div class="field-row">
      <span class="field-label">כתובת:</span>
      <span class="field-value">${params.plaintiffAddress || '__________________________'}</span>
      <span class="field-label">טלפון:</span>
      <span class="field-value">${params.plaintiffPhone}</span>
    </div>
  </div>

  <!-- DEFENDANT -->
  <div class="section">
    <div class="section-title">פרטי הנתבע</div>
    <div class="field-row">
      <span class="field-label">שם מלא / שם עסק:</span>
      <span class="field-value">${params.defendant || '__________________________'}</span>
    </div>
    <div class="field-row">
      <span class="field-label">כתובת:</span>
      <span class="field-value">${params.defendantAddress || '__________________________'}</span>
    </div>
  </div>

  <!-- AMOUNT -->
  <div class="section">
    <div class="section-title">סכום התביעה</div>
    <div class="amount-box">
      <span>₪ ${params.amount || '0'}</span>
    </div>
    <p style="font-size:11px; color:#666; margin-top:6px;">
      * הגבול המקסימלי לתביעה קטנה הינו 38,800 ₪ (נכון לשנת 2024)
    </p>
  </div>

  <!-- FACTS & CLAIM -->
  <div class="section">
    <div class="section-title">עילת התביעה והעובדות</div>
    <div class="summary-text">${params.summary || 'פרטי התביעה כפי שנאספו בראיון ה-AI.'}</div>
  </div>

  <!-- EVIDENCE -->
  <div class="section">
    <div class="section-title">רשימת ראיות</div>
    <ul class="evidence-list">${evidenceItems}</ul>
  </div>

  <!-- RELIEF SOUGHT -->
  <div class="section">
    <div class="section-title">הסעד המבוקש</div>
    <p>על בית המשפט לחייב את הנתבע לשלם לתובע סך של <strong>₪ ${params.amount || '____'}</strong>
    בצירוף הוצאות משפט ושכר טרחת עורך דין, וכן ריבית חוקית מיום הגשת התביעה.</p>
  </div>

  <!-- SIGNATURE -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="label">חתימת התובע</div>
      ${params.signatureUrl
        ? `<img class="sig-img" src="${params.signatureUrl}" width="160" height="70" />`
        : `<div class="sig-line"></div>`
      }
      <div style="font-size:11px; margin-top:4px;">${params.plaintiffName}</div>
    </div>
    <div class="court-stamp">חותמת בית משפט<br/>(למשרד בית המשפט)</div>
    <div class="date-box">
      <div class="label">תאריך הגשה</div>
      <div style="font-size:15px; font-weight:bold;">${params.date}</div>
    </div>
  </div>

  <div class="footer">
    מסמך זה נוצר באמצעות toviim.il — עוזר AI לתביעות קטנות | אינו מהווה ייעוץ משפטי
  </div>

</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ClaimDetailScreen({ route, navigation }: Props) {
  const { claimId } = route.params;
  const { user }    = useAuth();

  const sigRef = useRef<any>(null);

  const [claim,            setClaim]            = useState<Claim | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState<Tab>('evidence');

  // Evidence state
  const [evidenceList,     setEvidenceList]     = useState<Evidence[]>([]);
  const [uploading,        setUploading]        = useState(false);

  // Signature state
  const [signatureSaved,   setSignatureSaved]   = useState(false);
  const [signatureUrl,     setSignatureUrl]     = useState('');
  const [savingSig,        setSavingSig]        = useState(false);

  // PDF form state
  const [defendant,        setDefendant]        = useState('');
  const [defendantAddress, setDefendantAddress] = useState('');
  const [amount,           setAmount]           = useState('');
  const [plaintiffAddress, setPlaintiffAddress] = useState('');
  const [courtLocation,    setCourtLocation]    = useState('');
  const [generatingPdf,    setGeneratingPdf]    = useState(false);
  const [pdfGenerated,     setPdfGenerated]     = useState(false);
  const [pdfUri,           setPdfUri]           = useState('');

  // ── Load claim ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const c = await getClaim(claimId);
      if (c) {
        setClaim(c);
        setEvidenceList(c.evidence ?? []);
        setDefendant(c.defendant ?? '');
        setDefendantAddress(c.defendantAddress ?? '');
        setAmount(c.amount ? String(c.amount) : '');
        setPlaintiffAddress(c.plaintiffAddress ?? '');
        setSignatureUrl(c.signatureUrl ?? '');
        setSignatureSaved(!!c.signatureUrl);
      }
      setLoading(false);
    })();
  }, [claimId]);

  // ── Image picker ───────────────────────────────────────────────────────────
  const handlePickImage = useCallback(async (fromCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('נדרשת הרשאה', 'אנא אשר גישה למצלמה'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('נדרשת הרשאה', 'אנא אשר גישה לגלריה'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: false });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset    = result.assets[0];
      const fileName = `evidence_${Date.now()}.jpg`;

      setUploading(true);
      try {
        const ev = await uploadEvidence(user!.uid, claimId, asset.uri, fileName, 'image');
        const updated = [...evidenceList, ev];
        setEvidenceList(updated);
        await addEvidence(claimId, updated);
      } catch (err: any) {
        // If Storage not set up, save locally for PDF purposes
        const localEv: Evidence = {
          id:         `local_${Date.now()}`,
          uri:        asset.uri,
          localUri:   asset.uri,
          type:       'image',
          name:       fileName,
          uploadedAt: Date.now(),
        };
        const updated = [...evidenceList, localEv];
        setEvidenceList(updated);
        Alert.alert('שמור מקומית', 'הראיה נשמרה מקומית. ניתן יהיה להעלות לאחר הגדרת Firebase Storage.');
      } finally {
        setUploading(false);
      }
    } catch (err) {
      setUploading(false);
      Alert.alert('שגיאה', 'לא ניתן לבחור תמונה');
    }
  }, [evidenceList, claimId, user]);

  // ── Delete evidence ────────────────────────────────────────────────────────
  const handleDeleteEvidence = useCallback(async (id: string) => {
    const updated = evidenceList.filter(e => e.id !== id);
    setEvidenceList(updated);
    await addEvidence(claimId, updated);
  }, [evidenceList, claimId]);

  // ── Signature saved callback ───────────────────────────────────────────────
  const handleSignatureOK = useCallback(async (sigDataUrl: string) => {
    setSavingSig(true);
    try {
      let url = sigDataUrl;
      try {
        url = await uploadSignature(user!.uid, claimId, sigDataUrl);
      } catch (_) {
        // Firebase Storage not available — store the data URL directly
        url = sigDataUrl;
      }
      setSignatureUrl(url);
      setSignatureSaved(true);
      await updateClaimMeta(claimId, { signatureUrl: url });
      Alert.alert('✅ נשמר', 'החתימה נשמרה בהצלחה!');
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן לשמור את החתימה');
    } finally {
      setSavingSig(false);
    }
  }, [claimId, user]);

  // ── Generate PDF ───────────────────────────────────────────────────────────
  const handleGeneratePdf = useCallback(async () => {
    if (!claim) return;
    setGeneratingPdf(true);
    try {
      const today = new Date().toLocaleDateString('he-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      const html = buildPdfHtml({
        plaintiffName:    claim.plaintiffName  ?? '',
        plaintiffId:      claim.plaintiffId    ?? '',
        plaintiffPhone:   claim.plaintiffPhone ?? '',
        plaintiffAddress: plaintiffAddress     || claim.plaintiffAddress || '',
        defendant:        defendant            || claim.defendant         || '',
        defendantAddress: defendantAddress     || claim.defendantAddress  || '',
        amount:           amount               || String(claim.amount ?? ''),
        claimType:        CLAIM_TYPE_HE[claim.claimType ?? ''] ?? '',
        summary:          claim.summary        ?? '',
        evidenceList:     evidenceList.map(e => e.name),
        signatureUrl:     signatureUrl,
        date:             today,
        courtLocation:    courtLocation        || 'בית משפט שלום',
      });

      let uri = '';
      if (Platform.OS === 'web') {
        // On web: open the HTML in a new tab so the user can print/save as PDF
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        uri = URL.createObjectURL(blob);
        window.open(uri, '_blank');
      } else {
        const result = await Print.printToFileAsync({ html, base64: false });
        uri = result.uri;
      }
      setPdfUri(uri);
      setPdfGenerated(true);

      // Persist updated meta
      await updateClaimMeta(claimId, {
        status:           'review',
        defendant:        defendant,
        defendantAddress: defendantAddress,
        amount:           Number(amount) || claim.amount,
        plaintiffAddress: plaintiffAddress,
      });
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן ליצור PDF. בדוק שכל הפרטים מלאים.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [claim, defendant, defendantAddress, amount, plaintiffAddress, courtLocation, evidenceList, signatureUrl, claimId]);

  // ── Share PDF ──────────────────────────────────────────────────────────────
  const handleSharePdf = useCallback(async () => {
    if (!pdfUri) return;
    try {
      if (Platform.OS === 'web') {
        window.open(pdfUri, '_blank');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'שתף כתב תביעה',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('שיתוף', `PDF נוצר ב:\n${pdfUri}`);
      }
    } catch (_) {
      Alert.alert('שגיאה', 'לא ניתן לשתף את ה-PDF');
    }
  }, [pdfUri]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'evidence',  label: 'ראיות',  icon: '📎' },
    { key: 'signature', label: 'חתימה',  icon: '✍️' },
    { key: 'pdf',       label: 'PDF',    icon: '📄' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[700]} />

      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.primary[700], COLORS.primary[600]]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>בניית כתב תביעה</Text>
          {claim?.claimType && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{CLAIM_TYPE_HE[claim.claimType] ?? claim.claimType}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.trialBtn}
          onPress={() => navigation.navigate('MockTrial', { claimId })}
        >
          <Text style={styles.trialBtnText}>⚖️ מוק</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Plaintiff summary strip ── */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryName}>👤 {claim?.plaintiffName ?? 'משתמש'}</Text>
        {evidenceList.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{evidenceList.length} ראיות</Text>
          </View>
        )}
        {signatureSaved && (
          <View style={[styles.badge, styles.badgeGreen]}>
            <Text style={styles.badgeText}>✅ חתום</Text>
          </View>
        )}
        {pdfGenerated && (
          <View style={[styles.badge, styles.badgePurple]}>
            <Text style={styles.badgeText}>📄 PDF</Text>
          </View>
        )}
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab Content ── */}
      {/* ── EVIDENCE TAB ── */}
      {activeTab === 'evidence' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
          <Text style={styles.sectionTitle}>ראיות לתביעה</Text>
          <Text style={styles.sectionSub}>
            הוסף תמונות, קבלות, חוזים או כל מסמך רלוונטי. הראיות יופיעו בכתב התביעה.
          </Text>

          {/* Upload buttons */}
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
              onPress={() => handlePickImage(false)}
              disabled={uploading}
            >
              <Text style={styles.uploadBtnIcon}>🖼️</Text>
              <Text style={styles.uploadBtnText}>גלריה</Text>
            </TouchableOpacity>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
                onPress={() => handlePickImage(true)}
                disabled={uploading}
              >
                <Text style={styles.uploadBtnIcon}>📷</Text>
                <Text style={styles.uploadBtnText}>מצלמה</Text>
              </TouchableOpacity>
            )}
          </View>

          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary[600]} />
              <Text style={styles.uploadingText}>מעלה ראיה...</Text>
            </View>
          )}

          {/* Evidence grid */}
          {evidenceList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>עדיין לא הועלו ראיות</Text>
              <Text style={styles.emptySub}>הוסף תמונות של קבלות, חוזים, תכתובות וכד׳</Text>
            </View>
          ) : (
            <View style={styles.evidenceGrid}>
              {evidenceList.map(ev => (
                <View key={ev.id} style={styles.evidenceCard}>
                  <Image
                    source={{ uri: ev.localUri ?? ev.uri }}
                    style={styles.evidenceThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.evidenceInfo}>
                    <Text style={styles.evidenceName} numberOfLines={1}>{ev.name}</Text>
                    <Text style={styles.evidenceDate}>
                      {new Date(ev.uploadedAt).toLocaleDateString('he-IL')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.evidenceDelete}
                    onPress={() => Alert.alert('מחיקה', 'האם למחוק ראיה זו?', [
                      { text: 'ביטול', style: 'cancel' },
                      { text: 'מחק', style: 'destructive', onPress: () => handleDeleteEvidence(ev.id) },
                    ])}
                  >
                    <Text style={styles.evidenceDeleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {evidenceList.length > 0 && (
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => setActiveTab('signature')}
            >
              <Text style={styles.continueBtnText}>המשך לחתימה ←</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── SIGNATURE TAB ── */}
      {activeTab === 'signature' && (
        <View style={styles.sigTabContainer}>
          <ScrollView contentContainerStyle={styles.tabPad}>
            <Text style={styles.sectionTitle}>חתימה דיגיטלית</Text>
            <Text style={styles.sectionSub}>
              חתום/י בתיבה שלהלן. החתימה תופיע בכתב התביעה הרשמי.
            </Text>
          </ScrollView>

          {Platform.OS === 'web' ? (
            <View style={styles.webSigPlaceholder}>
              <Text style={styles.webSigIcon}>📱</Text>
              <Text style={styles.webSigTitle}>חתימה זמינה באפליקציה הנייד</Text>
              <Text style={styles.webSigSub}>
                על מנת לחתום, פתח את האפליקציה בטלפון. ניתן להמשיך ולצור PDF ללא חתימה.
              </Text>
              <TouchableOpacity style={styles.continueBtn} onPress={() => setActiveTab('pdf')}>
                <Text style={styles.continueBtnText}>המשך ל-PDF ←</Text>
              </TouchableOpacity>
            </View>
          ) : SignatureCanvas ? (
            <View style={styles.sigWrapper}>
              {signatureSaved && signatureUrl ? (
                <View style={styles.sigSavedBox}>
                  <Image source={{ uri: signatureUrl }} style={styles.sigSavedImg} resizeMode="contain" />
                  <Text style={styles.sigSavedLabel}>✅ חתימה נשמרה</Text>
                  <TouchableOpacity
                    style={styles.sigClearBtn}
                    onPress={() => {
                      setSignatureSaved(false);
                      setSignatureUrl('');
                      sigRef.current?.clearSignature();
                    }}
                  >
                    <Text style={styles.sigClearBtnText}>🔄 חתום שוב</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <SignatureCanvas
                    ref={sigRef}
                    onOK={handleSignatureOK}
                    onEmpty={() => Alert.alert('ריק', 'אנא חתום/י לפני השמירה')}
                    descriptionText=""
                    clearText="נקה"
                    confirmText="שמור חתימה"
                    webStyle={`
                      .m-signature-pad { box-shadow: none; border: none; }
                      .m-signature-pad--body { border: none; }
                      .m-signature-pad--footer { background: #f5f3ff; border-top: 1px solid #ddd6fe; }
                      .button { color: white; background: #7c3aed; }
                      .button.clear { background: #9ca3af; }
                    `}
                    style={styles.sigCanvas}
                    backgroundColor="rgb(255,255,255)"
                  />
                  {savingSig && (
                    <View style={styles.savingOverlay}>
                      <ActivityIndicator color={COLORS.primary[600]} />
                      <Text style={styles.savingText}>שומר חתימה...</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <View style={styles.webSigPlaceholder}>
              <Text style={styles.webSigIcon}>⚠️</Text>
              <Text style={styles.webSigTitle}>לא ניתן לטעון את לוח החתימות</Text>
            </View>
          )}
        </View>
      )}

      {/* ── PDF TAB ── */}
      {activeTab === 'pdf' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
          <Text style={styles.sectionTitle}>יצירת כתב תביעה</Text>
          <Text style={styles.sectionSub}>
            השלם/י את הפרטים החסרים. כתב התביעה יוצג לפי טופס 1 הרשמי.
          </Text>

          {/* Defendant details */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>פרטי הנתבע</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>שם הנתבע / שם העסק</Text>
              <TextInput
                style={styles.input}
                value={defendant}
                onChangeText={setDefendant}
                placeholder="לדוגמה: חברת ABC בע״מ"
                placeholderTextColor={COLORS.gray[400]}
                textAlign="right"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>כתובת הנתבע</Text>
              <TextInput
                style={styles.input}
                value={defendantAddress}
                onChangeText={setDefendantAddress}
                placeholder="רחוב, עיר"
                placeholderTextColor={COLORS.gray[400]}
                textAlign="right"
              />
            </View>
          </View>

          {/* Plaintiff details */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>פרטי התובע (להשלמה)</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>כתובת מגורים</Text>
              <TextInput
                style={styles.input}
                value={plaintiffAddress}
                onChangeText={setPlaintiffAddress}
                placeholder="רחוב, עיר, מיקוד"
                placeholderTextColor={COLORS.gray[400]}
                textAlign="right"
              />
            </View>
          </View>

          {/* Claim amount */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>סכום התביעה ובית המשפט</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>סכום בשקלים (₪)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="לדוגמה: 5000"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="number-pad"
                textAlign="right"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>בית משפט (עיר)</Text>
              <TextInput
                style={styles.input}
                value={courtLocation}
                onChangeText={setCourtLocation}
                placeholder="לדוגמה: בית משפט שלום תל אביב"
                placeholderTextColor={COLORS.gray[400]}
                textAlign="right"
              />
            </View>
          </View>

          {/* Evidence + signature status */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>{evidenceList.length > 0 ? '✅' : '⬜'}</Text>
              <Text style={styles.statusText}>{evidenceList.length} ראיות מצורפות</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>{signatureSaved ? '✅' : '⬜'}</Text>
              <Text style={styles.statusText}>{signatureSaved ? 'חתימה קיימת' : 'אין חתימה (אופציונלי)'}</Text>
            </View>
          </View>

          {/* Generate PDF button */}
          {!pdfGenerated ? (
            <TouchableOpacity
              style={[styles.pdfBtn, generatingPdf && styles.pdfBtnDisabled]}
              onPress={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.pdfBtnText}>📄 צור כתב תביעה (PDF)</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.pdfSuccessCard}>
              <Text style={styles.pdfSuccessIcon}>🎉</Text>
              <Text style={styles.pdfSuccessTitle}>כתב התביעה מוכן!</Text>
              <Text style={styles.pdfSuccessSub}>
                שמור את הקובץ והגש אותו לבית המשפט לתביעות קטנות הקרוב לביתך, או העלה ל-נט המשפט.
              </Text>
              <TouchableOpacity style={styles.shareBtn} onPress={handleSharePdf}>
                <Text style={styles.shareBtnText}>📤 שתף / שמור PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mockTrialBtn}
                onPress={() => navigation.navigate('MockTrial', { claimId })}
              >
                <Text style={styles.mockTrialBtnText}>⚖️ תרגל מוק-טריאל עם שופט AI</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.gray[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 20, color: COLORS.white },
  headerCenter:{ flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  typeBadgeText: { fontSize: 11, color: COLORS.white, fontWeight: '600' },
  trialBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  trialBtnText: { fontSize: 12, color: COLORS.white, fontWeight: '700' },

  summaryStrip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  summaryName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.gray[700], textAlign: 'right' },
  badge: {
    backgroundColor: COLORS.gray[200], borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeGreen:  { backgroundColor: '#dcfce7' },
  badgePurple: { backgroundColor: COLORS.primary[100] },
  badgeText:   { fontSize: 11, fontWeight: '600', color: COLORS.gray[700] },

  tabBar: {
    flexDirection: 'row-reverse', backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray[200],
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: COLORS.primary[600] },
  tabIcon:       { fontSize: 18, marginBottom: 2 },
  tabLabel:      { fontSize: 12, fontWeight: '600', color: COLORS.gray[400] },
  tabLabelActive:{ color: COLORS.primary[600] },

  tabContent: { flex: 1 },
  tabPad:     { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.gray[800], textAlign: 'right', marginBottom: SPACING.xs },
  sectionSub:   { fontSize: 13, color: COLORS.gray[500], textAlign: 'right', marginBottom: SPACING.lg, lineHeight: 20 },

  // Evidence
  uploadRow: { flexDirection: 'row-reverse', gap: SPACING.md, marginBottom: SPACING.md },
  uploadBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingVertical: SPACING.md,
    borderWidth: 2, borderColor: COLORS.primary[200], borderStyle: 'dashed',
    gap: 4,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnIcon:     { fontSize: 24 },
  uploadBtnText:     { fontSize: 13, fontWeight: '700', color: COLORS.primary[600] },

  uploadingRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  uploadingText: { fontSize: 13, color: COLORS.gray[600] },

  emptyState: {
    alignItems: 'center', paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.sm },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.gray[600] },
  emptySub:  { fontSize: 13, color: COLORS.gray[400], textAlign: 'center', marginTop: SPACING.xs, paddingHorizontal: SPACING.xl },

  evidenceGrid: { gap: SPACING.sm, marginBottom: SPACING.lg },
  evidenceCard: {
    flexDirection: 'row-reverse', backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  evidenceThumb: { width: 70, height: 70 },
  evidenceInfo:  { flex: 1, padding: SPACING.sm, justifyContent: 'center' },
  evidenceName:  { fontSize: 13, fontWeight: '600', color: COLORS.gray[700], textAlign: 'right' },
  evidenceDate:  { fontSize: 11, color: COLORS.gray[400], textAlign: 'right', marginTop: 2 },
  evidenceDelete:{ width: 44, alignItems: 'center', justifyContent: 'center' },
  evidenceDeleteIcon: { fontSize: 18 },

  continueBtn: {
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg,
  },
  continueBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // Signature
  sigTabContainer: { flex: 1 },
  sigWrapper:      { flex: 1 },
  sigCanvas:       { flex: 1 },

  sigSavedBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  sigSavedImg:   { width: 240, height: 100, borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: RADIUS.md },
  sigSavedLabel: { fontSize: 16, fontWeight: '700', color: COLORS.success, marginTop: SPACING.md },
  sigClearBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.gray[200],
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  sigClearBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray[700] },

  savingOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  savingText: { fontSize: 14, color: COLORS.gray[600] },

  webSigPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.md,
  },
  webSigIcon:  { fontSize: 56 },
  webSigTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[700], textAlign: 'center' },
  webSigSub:   { fontSize: 14, color: COLORS.gray[500], textAlign: 'center', lineHeight: 22 },

  // PDF form
  formCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  formCardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.gray[700], textAlign: 'right', marginBottom: SPACING.md },
  inputWrap:     { marginBottom: SPACING.sm },
  inputLabel:    { fontSize: 12, fontWeight: '600', color: COLORS.gray[500], textAlign: 'right', marginBottom: 4 },
  input: {
    backgroundColor: COLORS.gray[50], borderRadius: RADIUS.sm,
    borderWidth: 1.5, borderColor: COLORS.gray[200],
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: 14, color: COLORS.gray[800],
  },

  statusCard: {
    backgroundColor: COLORS.primary[50], borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg, gap: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.primary[100],
  },
  statusRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm },
  statusIcon: { fontSize: 16 },
  statusText: { fontSize: 13, color: COLORS.primary[700], fontWeight: '600' },

  pdfBtn: {
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.md,
    padding: SPACING.md + 2, alignItems: 'center',
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText:     { color: COLORS.white, fontWeight: '700', fontSize: 16 },

  pdfSuccessCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary[200],
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  pdfSuccessIcon:  { fontSize: 48, marginBottom: SPACING.sm },
  pdfSuccessTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray[800], marginBottom: SPACING.xs },
  pdfSuccessSub: {
    fontSize: 13, color: COLORS.gray[500], textAlign: 'center',
    lineHeight: 22, marginBottom: SPACING.lg,
  },
  shareBtn: {
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    width: '100%', alignItems: 'center', marginBottom: SPACING.sm,
  },
  shareBtnText:    { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  mockTrialBtn: {
    backgroundColor: COLORS.primary[50], borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.primary[300], paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4, width: '100%', alignItems: 'center',
  },
  mockTrialBtnText: { color: COLORS.primary[700], fontWeight: '700', fontSize: 14 },
});
