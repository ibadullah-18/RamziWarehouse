import { Stack } from 'expo-router';

import { useAuth } from '../../auth/auth-context';
import { colors } from '../../theme';

const legacyModulesEnabled = false;

export default function AppStackLayout() {
  const { session } = useAuth();

  const isAdmin = session?.role === 4;

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: 'none',
        }}
      />

      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="users" />
        <Stack.Screen name="create-user" />
        <Stack.Screen name="edit-user/[id]" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="create-customer" />
        <Stack.Screen name="edit-customer/[id]" />
      </Stack.Protected>

      <Stack.Protected
        guard={legacyModulesEnabled}
      >
        <Stack.Screen name="attendance" />
        <Stack.Screen name="create-order" />
        <Stack.Screen name="order-detail" />
        <Stack.Screen name="order-receipt/[id]" />
      </Stack.Protected>
    </Stack>
  );
}