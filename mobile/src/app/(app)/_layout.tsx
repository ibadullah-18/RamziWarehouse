import { Stack } from "expo-router";

import { useAuth } from "../../auth/auth-context";
import { can, Permission } from "../../auth/permissions";
import { colors } from "../../theme";

const legacyModulesEnabled = false;

export default function AppStackLayout() {
  const { session } = useAuth();

  const canUsers = can(session, Permission.UsersManage);
  const canSettings = can(session, Permission.SettingsManage);
  const canCustomers = can(session, Permission.CustomersEdit);

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: "none",
        }}
      />

      <Stack.Screen name="edit-return/[id]" />
      <Stack.Screen name="create-customer" />
      <Stack.Protected guard={canSettings}>
        <Stack.Screen name="return-code-rules" />
        <Stack.Screen name="app-settings" />
      </Stack.Protected>

      <Stack.Protected guard={canUsers}>
        <Stack.Screen name="users" />
        <Stack.Screen name="create-user" />
        <Stack.Screen name="edit-user/[id]" />
      </Stack.Protected>

      <Stack.Protected guard={false}>
        <Stack.Screen name="return-persons" />
      </Stack.Protected>

      <Stack.Protected guard={canCustomers}>
        <Stack.Screen name="customers" />
        <Stack.Screen name="edit-customer/[id]" />
      </Stack.Protected>

      <Stack.Protected guard={legacyModulesEnabled}>
        <Stack.Screen name="attendance" />
        <Stack.Screen name="create-order" />
        <Stack.Screen name="order-detail" />
        <Stack.Screen name="order-receipt/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
