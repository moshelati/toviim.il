import type { NavigatorScreenParams } from '@react-navigation/native';

/* ── Auth flow (unauthenticated) ───────────────────────────────── */
export type AuthStackParamList = {
  Welcome:    undefined;
  Disclaimer: undefined;
  Login:      undefined;
  SignUp:     undefined;
  Terms:      undefined;
  Privacy:    undefined;
};

/* ── Bottom tabs ───────────────────────────────────────────────── */
export type TabParamList = {
  HomeTab:    undefined;
  ClaimsTab:  undefined;
  GuideTab:   undefined;
  ProfileTab: undefined;
};

/* ── App stack (authenticated) — tabs + pushed screens ─────────── */
export type AppStackParamList = {
  /** Bottom tabs live here as a single screen */
  MainTabs:    NavigatorScreenParams<TabParamList>;

  /** Screens that push on top of tabs (hides tab bar) */
  NewClaim:        undefined;
  ClaimChat:       { claimId: string; claimType: string };
  ClaimDetail:     { claimId: string };
  MockTrial:       { claimId: string };
  Confidence:      { claimId: string };

  /** New platform screens */
  ClaimHub:        { claimId: string };
  Eligibility:     { claimType?: string };
  PlaintiffForm:   { claimId: string };
  DefendantForm:   { claimId: string };
  TimelineForm:    { claimId: string };
  DemandForm:      { claimId: string };
  EvidenceLinking: { claimId: string };
  Preflight:       { claimId: string };
  WarningLetter:   { claimId: string };

  /** Legal pages */
  Terms:       undefined;
  Privacy:     undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;
