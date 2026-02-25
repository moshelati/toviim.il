export type AuthStackParamList = {
  Welcome:    undefined;
  Disclaimer: undefined;
  Login:      undefined;
  SignUp:      undefined;
};

export type AppStackParamList = {
  Home:        undefined;
  NewClaim:    undefined;
  ClaimChat:   { claimId: string; claimType: string };
  ClaimDetail: { claimId: string };
  MockTrial:   { claimId: string };
  Profile:     undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;
