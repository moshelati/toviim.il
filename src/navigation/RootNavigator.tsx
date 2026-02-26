import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

// Auth screens
import { WelcomeScreen }    from '../screens/onboarding/WelcomeScreen';
import { DisclaimerScreen } from '../screens/onboarding/DisclaimerScreen';
import { LoginScreen }      from '../screens/auth/LoginScreen';
import { SignUpScreen }     from '../screens/auth/SignUpScreen';

// Tab screens
import { HomeScreen }       from '../screens/app/HomeScreen';
import { ClaimsScreen }     from '../screens/app/ClaimsScreen';
import { GuideScreen }      from '../screens/app/GuideScreen';
import { ProfileScreen }    from '../screens/app/ProfileScreen';

// Pushed screens (on top of tabs)
import { NewClaimScreen }    from '../screens/app/NewClaimScreen';
import { ClaimChatScreen }   from '../screens/app/ClaimChatScreen';
import { ClaimDetailScreen } from '../screens/app/ClaimDetailScreen';
import { MockTrialScreen }   from '../screens/app/MockTrialScreen';
import { ConfidenceScreen }  from '../screens/app/ConfidenceScreen';

// Legal screens
import { TermsScreen }   from '../screens/legal/TermsScreen';
import { PrivacyScreen } from '../screens/legal/PrivacyScreen';

import type { AuthStackParamList, AppStackParamList, TabParamList } from '../types/navigation';

// ─── Navigators ────────────────────────────────────────────────
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator<AppStackParamList>();
const Tab       = createBottomTabNavigator<TabParamList>();

// ─── Tab icon component ────────────────────────────────────────
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{emoji}</Text>
    </View>
  );
}

// ─── Tab navigator ─────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: tabStyles.label,
        tabBarItemStyle: tabStyles.item,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: '\u05D1\u05D9\u05EA',
          tabBarIcon: ({ focused }) => <TabIcon emoji={'\uD83C\uDFE0'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ClaimsTab"
        component={ClaimsScreen}
        options={{
          tabBarLabel: '\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA',
          tabBarIcon: ({ focused }) => <TabIcon emoji={'\uD83D\uDCCB'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GuideTab"
        component={GuideScreen}
        options={{
          tabBarLabel: '\u05DE\u05D3\u05E8\u05D9\u05DA',
          tabBarIcon: ({ focused }) => <TabIcon emoji={'\uD83D\uDCD6'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: '\u05D7\u05E9\u05D1\u05D5\u05DF',
          tabBarIcon: ({ focused }) => <TabIcon emoji={'\uD83D\uDC64'} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Auth stack ────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Welcome"    component={WelcomeScreen}    />
      <AuthStack.Screen name="Disclaimer" component={DisclaimerScreen} />
      <AuthStack.Screen name="Login"      component={LoginScreen}      />
      <AuthStack.Screen name="SignUp"     component={SignUpScreen}     />
      <AuthStack.Screen name="Terms"      component={TermsScreen}      />
      <AuthStack.Screen name="Privacy"    component={PrivacyScreen}    />
    </AuthStack.Navigator>
  );
}

// ─── App stack (tabs + pushed screens) ─────────────────────────
function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AppStack.Screen name="MainTabs"    component={MainTabs}         />
      <AppStack.Screen name="NewClaim"    component={NewClaimScreen}    />
      <AppStack.Screen name="ClaimChat"   component={ClaimChatScreen}   />
      <AppStack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
      <AppStack.Screen name="MockTrial"   component={MockTrialScreen}   />
      <AppStack.Screen name="Confidence"  component={ConfidenceScreen}  />
      <AppStack.Screen name="Terms"       component={TermsScreen}       />
      <AppStack.Screen name="Privacy"     component={PrivacyScreen}     />
    </AppStack.Navigator>
  );
}

// ─── Root ──────────────────────────────────────────────────────
export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
});

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    height: Platform.select({ ios: 88, android: 64, default: 64 }),
    ...Shadows.sm,
  },
  item: {
    paddingVertical: 2,
  },
  label: {
    ...Typography.tiny,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryLight,
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    fontSize: 22,
  },
});
