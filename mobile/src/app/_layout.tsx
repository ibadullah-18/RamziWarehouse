import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AuthProvider,
  useAuth,
} from '../auth/auth-context';
import {
  AppToastProvider,
} from '../components/app-toast';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../theme';

function SessionLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>
          RC
        </Text>
      </View>

      <Text style={styles.appName}>
        Ram Collection
      </Text>

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

  logo: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },

  logoText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },

  appName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
  },

  indicator: {
    marginTop: spacing.xl,
  },
});