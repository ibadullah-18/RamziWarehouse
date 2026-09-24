import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  AuthProvider,
  useAuth,
} from '../auth/auth-context';
import {
  AppToastProvider,
} from '../components/app-toast';
import { BrandLogo } from '../components/brand-logo';
import {
  colors,
  spacing,
} from '../theme';

function SessionLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <BrandLogo width={240} />

      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={styles.indicator}
      />
    </View>
  );
}

function RootNavigator() {
  const {
    isLoading,
    isAuthenticated,
  } = useAuth();

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor:
            colors.background,
        },
        animation: 'fade',
      }}
    >
      <Stack.Protected
        guard={!isAuthenticated}
      >
        <Stack.Screen name="index" />
      </Stack.Protected>

      <Stack.Protected
        guard={isAuthenticated}
      >
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppToastProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AppToastProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  indicator: {
    marginTop: spacing.xl,
  },
});


