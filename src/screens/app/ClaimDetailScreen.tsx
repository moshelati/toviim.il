import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  TouchableOpacity, ScrollView, Image, ActivityIndicator,
  Alert, TextInput, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { getClaim, addEvidence, updateClaimMeta } from '../../lib/claimsService';
import { uploadEvidence, uploadSignature } from '../../lib/evidenceService';
import { Claim, Evidence } from '../../types/claim';
import { AppHeader } from '../../components/ui/AppHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PrimaryButton, SecondaryButton } from '../../components/ui/PrimaryButton';
import { ProgressRing, getScoreColor } from '../../components/ui/ProgressRing';
import { Colors, Typography, Spacing, Radius, Shadows, SCREEN_PADDING } from '../../theme';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS, formatNIS } from '../../config/legal';

// Conditional import for SignatureCanvas (not available on web)
let SignatureCanvas: any = null;
if (Platform.OS !== 'web') {
  try {
    SignatureCanvas = require('react-native-signature-canvas').default;
  } catch (_) {}
}

type Props = NativeStackScreenProps<AppStackParamList, 'ClaimDetail'>;
type Tab = 'overview' | 'evidence' | 'signature' | 'pdf';

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
      * הגבול המקסימלי לתביעה קטנה הינו ${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')} ₪
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
  const [activeTab,        setActiveTab]        = useState<Tab>('overview');

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
        setDefendant(c.defendant ?? c.defendants?.[0]?.name ?? '');
        setDefendantAddress(c.defendantAddress ?? c.defendants?.[0]?.address ?? '');
        setAmount(c.amount ? String(c.amount) : c.amountClaimedNis ? String(c.amountClaimedNis) : '');
        setPlaintiffAddress(c.plaintiffAddress ?? c.plaintiff?.address ?? '');
        setSignatureUrl(c.signatureUrl ?? c.signatureUri ?? '');
        setSignatureSaved(!!(c.signatureUrl || c.signatureUri));
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
        plaintiffName:    claim.plaintiffName  ?? claim.plaintiff?.fullName ?? '',
        plaintiffId:      claim.plaintiffId    ?? claim.plaintiff?.idNumber ?? '',
        plaintiffPhone:   claim.plaintiffPhone ?? claim.plaintiff?.phone ?? '',
        plaintiffAddress: plaintiffAddress     || claim.plaintiffAddress || claim.plaintiff?.address || '',
        defendant:        defendant            || claim.defendant || claim.defendants?.[0]?.name || '',
        defendantAddress: defendantAddress     || claim.defendantAddress || claim.defendants?.[0]?.address || '',
        amount:           amount               || String(claim.amount ?? claim.amountClaimedNis ?? ''),
        claimType:        CLAIM_TYPE_HE[claim.claimType ?? ''] ?? '',
        summary:          claim.factsSummary   || claim.summary || '',
        evidenceList:     evidenceList.map(e => e.name),
        signatureUrl:     signatureUrl,
        date:             today,
        courtLocation:    courtLocation        || 'בית משפט שלום',
      });

      let uri = '';
      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        uri = URL.createObjectURL(blob);
        window.open(uri, '_blank');
      } else {
        const result = await Print.printToFileAsync({ html, base64: false });
        uri = result.uri;
      }
      setPdfUri(uri);
      setPdfGenerated(true);

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
      <View style={styles.screen}>
        <AppHeader title="בניית כתב תביעה" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview',   label: 'סקירה',  icon: '📊' },
    { key: 'evidence',   label: 'ראיות',  icon: '📎' },
    { key: 'signature',  label: 'חתימה',  icon: '✍️' },
    { key: 'pdf',        label: 'PDF',    icon: '📄' },
  ];

  const readinessScore = claim?.readinessScore ?? 0;
  const scoreColor = getScoreColor(readinessScore);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <AppHeader
        title="בניית כתב תביעה"
        subtitle={claim?.claimType ? CLAIM_TYPE_HE[claim.claimType] : undefined}
        onBack={() => navigation.goBack()}
        rightIcon={<Text style={styles.trialBtnIcon}>⚖️</Text>}
        onRight={() => navigation.navigate('MockTrial', { claimId })}
      />

      {/* ── Plaintiff summary strip ── */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryName}>👤 {claim?.plaintiffName ?? 'משתמש'}</Text>
        <View style={styles.stripBadges}>
          {evidenceList.length > 0 && (
            <Badge label={`${evidenceList.length} ראיות`} variant="muted" />
          )}
          {signatureSaved && (
            <Badge label="חתום" variant="success" icon="✅" />
          )}
          {pdfGenerated && (
            <Badge label="PDF" variant="primary" icon="📄" />
          )}
        </View>
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
      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>
          {/* Readiness Score */}
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>ציון מוכנות</Text>
            <View style={styles.scoreRow}>
              <ProgressRing score={readinessScore} size={90} strokeWidth={6} />
              <View style={styles.scoreInfo}>
                <Text style={[styles.strengthBadge, { backgroundColor: scoreColor + '20', color: scoreColor }]}>
                  {claim?.strengthScore === 'strong' ? '💪 חזקה' :
                   claim?.strengthScore === 'medium' ? '👍 בינונית' : '⚠️ חלשה'}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Confidence', { claimId })}
                  style={styles.detailLink}
                >
                  <Text style={styles.detailLinkText}>פירוט מלא ←</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.scoreBarBg}>
              <View style={[styles.scoreBarFill, { width: `${Math.min(readinessScore, 100)}%`, backgroundColor: scoreColor }]} />
            </View>
          </Card>

          {/* Claim Summary */}
          {(claim?.summary || claim?.factsSummary) && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>📋 סיכום התביעה</Text>
              <Text style={styles.sectionCardText}>
                {claim?.factsSummary || claim?.summary}
              </Text>
            </Card>
          )}

          {/* Timeline */}
          {claim?.timeline && claim.timeline.length > 0 && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>📅 ציר זמן</Text>
              {claim.timeline.map((event, i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDate}>{event.date}</Text>
                    <Text style={styles.timelineDesc}>{event.description || event.event}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Demands */}
          {claim?.demands && claim.demands.length > 0 && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>💰 סעדים מבוקשים</Text>
              {claim.demands.map((demand, i) => (
                <View key={i} style={styles.demandRow}>
                  <Text style={styles.demandBullet}>•</Text>
                  <Text style={styles.demandText}>{demand}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Risk Flags */}
          {claim?.riskFlags && claim.riskFlags.length > 0 && (
            <Card style={[styles.sectionCard, styles.riskCard]}>
              <Text style={styles.sectionCardTitle}>🚩 דגלי סיכון</Text>
              {claim.riskFlags.map((flag, i) => (
                <View key={i} style={styles.flagRow}>
                  <Text style={styles.flagIcon}>{typeof flag === 'object' ? (flag.icon || '⚠️') : '⚠️'}</Text>
                  <View style={styles.flagContent}>
                    <Text style={styles.flagTitle}>
                      {typeof flag === 'object' ? flag.title : String(flag)}
                    </Text>
                    {typeof flag === 'object' && flag.description ? (
                      <Text style={styles.flagDesc}>{flag.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Missing Fields */}
          {claim?.missingFields && claim.missingFields.length > 0 && (
            <Card style={[styles.sectionCard, styles.missingCard]}>
              <Text style={styles.sectionCardTitle}>📝 שדות חסרים</Text>
              {claim.missingFields.map((field, i) => (
                <View key={i} style={styles.flagRow}>
                  <Text style={styles.flagIcon}>
                    {typeof field === 'object' && field.importance === 'required' ? '🔴' : '🟡'}
                  </Text>
                  <Text style={styles.flagTitle}>
                    {typeof field === 'object' ? field.label : String(field)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Suggestions */}
          {claim?.suggestions && claim.suggestions.length > 0 && (
            <Card style={[styles.sectionCard, styles.suggestCard]}>
              <Text style={styles.sectionCardTitle}>💡 המלצות לשיפור</Text>
              {claim.suggestions.map((sug, i) => (
                <View key={i} style={styles.flagRow}>
                  <Text style={styles.flagIcon}>{typeof sug === 'object' ? (sug.icon || '💡') : '💡'}</Text>
                  <View style={styles.flagContent}>
                    <Text style={styles.flagTitle}>
                      {typeof sug === 'object' ? sug.title : String(sug)}
                    </Text>
                    {typeof sug === 'object' && sug.description ? (
                      <Text style={styles.flagDesc}>{sug.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          )}

          <PrimaryButton
            title="המשך לראיות ←"
            onPress={() => setActiveTab('evidence')}
            style={{ marginTop: Spacing.base }}
          />
        </ScrollView>
      )}

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
              <ActivityIndicator size="small" color={Colors.primary} />
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
                <Card key={ev.id} noPadding style={styles.evidenceCard}>
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
                </Card>
              ))}
            </View>
          )}

          {evidenceList.length > 0 && (
            <PrimaryButton
              title="המשך לחתימה ←"
              onPress={() => setActiveTab('signature')}
              style={{ marginTop: Spacing.base }}
            />
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
              <PrimaryButton
                title="המשך ל-PDF ←"
                onPress={() => setActiveTab('pdf')}
                style={{ marginTop: Spacing.base }}
              />
            </View>
          ) : SignatureCanvas ? (
            <View style={styles.sigWrapper}>
              {signatureSaved && signatureUrl ? (
                <View style={styles.sigSavedBox}>
                  <Image source={{ uri: signatureUrl }} style={styles.sigSavedImg} resizeMode="contain" />
                  <Text style={styles.sigSavedLabel}>✅ חתימה נשמרה</Text>
                  <SecondaryButton
                    title="🔄 חתום שוב"
                    onPress={() => {
                      setSignatureSaved(false);
                      setSignatureUrl('');
                      sigRef.current?.clearSignature();
                    }}
                    small
                    style={{ marginTop: Spacing.base }}
                  />
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
                      .m-signature-pad--footer { background: ${Colors.primaryLight}; border-top: 1px solid ${Colors.border}; }
                      .button { color: white; background: ${Colors.primary}; }
                      .button.clear { background: ${Colors.gray400}; }
                    `}
                    style={styles.sigCanvas}
                    backgroundColor="rgb(255,255,255)"
                  />
                  {savingSig && (
                    <View style={styles.savingOverlay}>
                      <ActivityIndicator color={Colors.primary} />
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
          <Card style={styles.formCard}>
            <Text style={styles.formCardTitle}>פרטי הנתבע</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>שם הנתבע / שם העסק</Text>
              <TextInput
                style={styles.input}
                value={defendant}
                onChangeText={setDefendant}
                placeholder="לדוגמה: חברת ABC בע״מ"
                placeholderTextColor={Colors.gray400}
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
                placeholderTextColor={Colors.gray400}
                textAlign="right"
              />
            </View>
          </Card>

          {/* Plaintiff details */}
          <Card style={styles.formCard}>
            <Text style={styles.formCardTitle}>פרטי התובע (להשלמה)</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>כתובת מגורים</Text>
              <TextInput
                style={styles.input}
                value={plaintiffAddress}
                onChangeText={setPlaintiffAddress}
                placeholder="רחוב, עיר, מיקוד"
                placeholderTextColor={Colors.gray400}
                textAlign="right"
              />
            </View>
          </Card>

          {/* Claim amount */}
          <Card style={styles.formCard}>
            <Text style={styles.formCardTitle}>סכום התביעה ובית המשפט</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>סכום בשקלים (₪)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="לדוגמה: 5000"
                placeholderTextColor={Colors.gray400}
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
                placeholderTextColor={Colors.gray400}
                textAlign="right"
              />
            </View>
          </Card>

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
            <PrimaryButton
              title="📄 צור כתב תביעה (PDF)"
              onPress={handleGeneratePdf}
              disabled={generatingPdf}
              loading={generatingPdf}
            />
          ) : (
            <Card style={styles.pdfSuccessCard}>
              <Text style={styles.pdfSuccessIcon}>🎉</Text>
              <Text style={styles.pdfSuccessTitle}>כתב התביעה מוכן!</Text>
              <Text style={styles.pdfSuccessSub}>
                שמור את הקובץ והגש אותו לבית המשפט לתביעות קטנות הקרוב לביתך, או העלה ל-נט המשפט.
              </Text>
              <PrimaryButton
                title="📤 שתף / שמור PDF"
                onPress={handleSharePdf}
                style={{ marginBottom: Spacing.sm }}
              />
              <SecondaryButton
                title="⚖️ תרגל מוק-טריאל עם שופט AI"
                onPress={() => navigation.navigate('MockTrial', { claimId })}
              />
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  trialBtnIcon: { fontSize: 16 },

  summaryStrip: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryName: {
    ...Typography.caption, fontWeight: '600',
    color: Colors.gray700, textAlign: 'right', flex: 1,
  },
  stripBadges: {
    flexDirection: 'row-reverse', gap: Spacing.xs,
  },

  tabBar: {
    flexDirection: 'row-reverse', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.gray200,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: Colors.primary },
  tabIcon:       { fontSize: 18, marginBottom: 2 },
  tabLabel:      { ...Typography.tiny, color: Colors.gray400 },
  tabLabelActive:{ color: Colors.primary, fontWeight: '700' },

  tabContent: { flex: 1 },
  tabPad:     { padding: SCREEN_PADDING, paddingBottom: Spacing.xxl },

  sectionTitle: { ...Typography.h3, color: Colors.gray800, textAlign: 'right', marginBottom: Spacing.xs },
  sectionSub:   { ...Typography.caption, color: Colors.gray500, textAlign: 'right', marginBottom: Spacing.xl, lineHeight: 20 },

  // ── Overview tab ──
  scoreCard: {
    alignItems: 'center', marginBottom: Spacing.base,
  },
  scoreLabel: { ...Typography.small, color: Colors.muted, marginBottom: Spacing.sm },
  scoreRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    gap: Spacing.xl, marginBottom: Spacing.base,
  },
  scoreInfo: { alignItems: 'center', gap: Spacing.sm },
  strengthBadge: {
    ...Typography.caption, fontWeight: '700',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  detailLink: { paddingVertical: Spacing.xs },
  detailLinkText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  scoreBarBg: {
    width: '100%', height: 6, backgroundColor: Colors.gray200,
    borderRadius: 3, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  sectionCard: { marginBottom: Spacing.md },
  sectionCardTitle: {
    ...Typography.bodyMedium, fontWeight: '700',
    color: Colors.gray800, textAlign: 'right', marginBottom: Spacing.sm,
  },
  sectionCardText: {
    ...Typography.small, color: Colors.gray600,
    textAlign: 'right', lineHeight: 22,
  },

  timelineRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start',
    marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary, marginTop: 5,
  },
  timelineContent: { flex: 1 },
  timelineDate: { ...Typography.tiny, fontWeight: '700', color: Colors.primary, textAlign: 'right' },
  timelineDesc: { ...Typography.caption, color: Colors.gray600, textAlign: 'right', lineHeight: 20 },

  demandRow: { flexDirection: 'row-reverse', marginBottom: Spacing.xs, gap: Spacing.xs },
  demandBullet: { ...Typography.small, color: Colors.primary, fontWeight: '700' },
  demandText: { ...Typography.small, color: Colors.gray700, textAlign: 'right', lineHeight: 22, flex: 1 },

  riskCard: { borderColor: Colors.warningLight, backgroundColor: '#FFFBEB' },
  missingCard: { borderColor: Colors.dangerLight, backgroundColor: '#FEF2F2' },
  suggestCard: { borderColor: Colors.primaryLight, backgroundColor: Colors.primaryLight },

  flagRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  flagIcon: { fontSize: 14, marginTop: 2 },
  flagContent: { flex: 1 },
  flagTitle: { ...Typography.caption, fontWeight: '600', color: Colors.gray700, textAlign: 'right' },
  flagDesc: { ...Typography.tiny, color: Colors.gray500, textAlign: 'right', lineHeight: 18, marginTop: 2 },

  // ── Evidence tab ──
  uploadRow: { flexDirection: 'row-reverse', gap: Spacing.base, marginBottom: Spacing.base },
  uploadBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing.base,
    borderWidth: 2, borderColor: Colors.primaryMid + '60', borderStyle: 'dashed',
    gap: 4, ...Shadows.sm,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnIcon:     { fontSize: 24 },
  uploadBtnText:     { ...Typography.caption, fontWeight: '700', color: Colors.primary },

  uploadingRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, marginBottom: Spacing.base,
  },
  uploadingText: { ...Typography.caption, color: Colors.gray600 },

  emptyState: {
    alignItems: 'center', paddingVertical: Spacing.xxl,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { ...Typography.body, fontWeight: '700', color: Colors.gray600 },
  emptySub:  { ...Typography.caption, color: Colors.gray400, textAlign: 'center', marginTop: Spacing.xs, paddingHorizontal: Spacing.xl },

  evidenceGrid: { gap: Spacing.sm, marginBottom: Spacing.base },
  evidenceCard: {
    flexDirection: 'row-reverse', overflow: 'hidden',
  },
  evidenceThumb: { width: 70, height: 70 },
  evidenceInfo:  { flex: 1, padding: Spacing.sm, justifyContent: 'center' },
  evidenceName:  { ...Typography.caption, fontWeight: '600', color: Colors.gray700, textAlign: 'right' },
  evidenceDate:  { ...Typography.tiny, color: Colors.gray400, textAlign: 'right', marginTop: 2 },
  evidenceDelete:{ width: 44, alignItems: 'center', justifyContent: 'center' },
  evidenceDeleteIcon: { fontSize: 18 },

  // ── Signature tab ──
  sigTabContainer: { flex: 1 },
  sigWrapper:      { flex: 1 },
  sigCanvas:       { flex: 1 },

  sigSavedBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  sigSavedImg:   { width: 240, height: 100, borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.md },
  sigSavedLabel: { ...Typography.body, fontWeight: '700', color: Colors.success, marginTop: Spacing.base },

  savingOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  savingText: { ...Typography.small, color: Colors.gray600 },

  webSigPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.base,
  },
  webSigIcon:  { fontSize: 56 },
  webSigTitle: { ...Typography.bodyLarge, color: Colors.gray700, textAlign: 'center' },
  webSigSub:   { ...Typography.small, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },

  // ── PDF tab ──
  formCard: { marginBottom: Spacing.base },
  formCardTitle: { ...Typography.small, fontWeight: '800', color: Colors.gray700, textAlign: 'right', marginBottom: Spacing.base },
  inputWrap:     { marginBottom: Spacing.sm },
  inputLabel:    { ...Typography.tiny, fontWeight: '600', color: Colors.gray500, textAlign: 'right', marginBottom: 4 },
  input: {
    backgroundColor: Colors.gray50, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.gray200,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm + 2,
    ...Typography.small, color: Colors.gray800,
  },

  statusCard: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
    padding: Spacing.base, marginBottom: Spacing.xl, gap: Spacing.xs,
    borderWidth: 1, borderColor: Colors.primaryMid + '40',
  },
  statusRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.sm },
  statusIcon: { fontSize: 16 },
  statusText: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '600' },

  pdfSuccessCard: {
    alignItems: 'center', borderWidth: 2, borderColor: Colors.primaryMid + '40',
  },
  pdfSuccessIcon:  { fontSize: 48, marginBottom: Spacing.sm },
  pdfSuccessTitle: { ...Typography.h2, color: Colors.gray800, marginBottom: Spacing.xs },
  pdfSuccessSub: {
    ...Typography.caption, color: Colors.muted,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl,
  },
});
