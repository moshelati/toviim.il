import React from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet,
  Platform, TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing } from '../theme';

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

// ─── Constants ────────────────────────────────────────────────
/** Extra bottom padding screens need to clear the floating tab bar */
export const FLOATING_TAB_BAR_HEIGHT = 90;

const TAB_CONFIG: { emoji: string; label: string }[] = [
  { emoji: '\uD83C\uDFE0', label: '\u05D1\u05D9\u05EA' },
  { emoji: '\uD83D\uDCCB', label: '\u05EA\u05D1\u05D9\u05E2\u05D5\u05EA' },
  { emoji: '\uD83D\uDCD6', label: '\u05DE\u05D3\u05E8\u05D9\u05DA' },
  { emoji: '\uD83D\uDC64', label: '\u05D7\u05E9\u05D1\u05D5\u05DF' },
];

// ─── Navigators ────────────────────────────────────────────────
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator<AppStackParamList>();
const Tab       = createBottomTabNavigator<TabParamList>();

// ─── iOS 26 Floating Glass Tab Bar ─────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        floatingStyles.wrapper,
        { paddingBottom: Math.max(insets.bottom - 8, 8) },
      ]}
      pointerEvents="box-none"
    >
      {/* Shadow wrapper — separate from overflow:hidden so shadow renders */}
      <View style={floatingStyles.shadowWrap}>
        {/* Pill with clipped blur */}
        <View style={floatingStyles.pill}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 95}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          {/* Light tint overlay for consistent glass look */}
          <View style={floatingStyles.tint} />
          {/* Tab items */}
          <View style={floatingStyles.inner}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const config = TAB_CONFIG[index];

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={config.label}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[
                    floatingStyles.tab,
                    focused && floatingStyles.tabActive,
                  ]}
                  activeOpacity={0.65}
                >
                  <Text
                    style={[
                      floatingStyles.icon,
                      focused && floatingStyles.iconActive,
                    ]}
                  >
                    {config.emoji}
                  </Text>
                  <Text
                    style={[
                      floatingStyles.label,
                      focused
                        ? floatingStyles.labelActive
                        : floatingStyles.labelInactive,
                    ]}
                    numberOfLines={1}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Tab navigator ─────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab"    component={HomeScreen}    />
      <Tab.Screen name="ClaimsTab"  component={ClaimsScreen}  />
      <Tab.Screen name="GuideTab"   component={GuideScreen}   />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
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

const floatingStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shadowWrap: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pill: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: Spacing.xl,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios'
      ? 'rgba(255,255,255,0.25)'
      : 'rgba(255,255,255,0.88)',
  },
  inner: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 22,
    gap: 2,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  labelActive: {
    color: Colors.primary,
  },
  labelInactive: {
    color: Colors.gray400,
  },
});
