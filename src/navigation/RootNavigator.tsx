import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

// Auth screens
import { WelcomeScreen }    from '../screens/onboarding/WelcomeScreen';
import { DisclaimerScreen } from '../screens/onboarding/DisclaimerScreen';
import { LoginScreen }      from '../screens/auth/LoginScreen';
import { SignUpScreen }     from '../screens/auth/SignUpScreen';

// App screens
import { HomeScreen }        from '../screens/app/HomeScreen';
import { NewClaimScreen }    from '../screens/app/NewClaimScreen';
import { ClaimChatScreen }   from '../screens/app/ClaimChatScreen';
import { ClaimDetailScreen } from '../screens/app/ClaimDetailScreen';
import { MockTrialScreen }   from '../screens/app/MockTrialScreen';

import type { AuthStackParamList, AppStackParamList } from '../types/navigation';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Welcome"    component={WelcomeScreen}    />
      <AuthStack.Screen name="Disclaimer" component={DisclaimerScreen} />
      <AuthStack.Screen name="Login"      component={LoginScreen}      />
      <AuthStack.Screen name="SignUp"     component={SignUpScreen}     />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AppStack.Screen name="Home"        component={HomeScreen}        />
      <AppStack.Screen name="NewClaim"    component={NewClaimScreen}    />
      <AppStack.Screen name="ClaimChat"   component={ClaimChatScreen}   />
      <AppStack.Screen name="ClaimDetail" component={ClaimDetailScreen} />
      <AppStack.Screen name="MockTrial"   component={MockTrialScreen}   />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary[600]} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
});
