import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../../auth/auth-context';
import { UserRole } from '../../../auth/auth-types';
import { can, Permission } from '../../../auth/permissions';
import { handoverDraft } from '../../../features/handovers/handover-draft';
import { captureForDraft } from '../../../features/handovers/new-handover';
import { colors } from '../../../theme';

const legacyModulesEnabled = false;

export default function MainTabsLayout() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const role = session?.role;
  const isAdmin = can(session, Permission.AdminPanel);

  const canUseAccounts = can(session, Permission.AccountsUse);
  const canHandoverCreate = can(session, Permission.HandoversCreate);
  const canHandover = canHandoverCreate || can(session, Permission.HandoversView);

  const opensAccountsFirst =
    canUseAccounts &&
    (role === UserRole.Accountant ||
      role === UserRole.Driver);

  return (
    <Tabs
      initialRouteName={
        opensAccountsFirst
          ? 'accounts'
          : 'returns'
      }
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          colors.primary,
        tabBarInactiveTintColor:
          colors.textLight,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          height: 64 + Math.max(insets.bottom, 10),
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'İdarəetmə',
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                name={
                  focused
                    ? 'shield-checkmark'
                    : 'shield-checkmark-outline'
                }
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected
        guard={legacyModulesEnabled}
      >
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Qaimələr',
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                name={
                  focused
                    ? 'receipt'
                    : 'receipt-outline'
                }
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="returns"
        options={{
          title: 'Vazvrad',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'arrow-undo'
                  : 'arrow-undo-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Protected guard={canUseAccounts}>
        <Tabs.Screen
          name="accounts"
          options={{
            title: 'Açot',
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                name={
                  focused
                    ? 'wallet'
                    : 'wallet-outline'
                }
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={canHandover}>
        <Tabs.Screen
          name="handover"
          listeners={{
            // Tapping "Təhvil" opens the camera at once when a new handover is started.
            // Called right inside the tap, so the web app (iPhone) may open the camera too.
            tabPress: () => {
              if (canHandoverCreate && handoverDraft.get().photos.length === 0) void captureForDraft();
            },
          }}
          options={{
            title: 'Təhvil',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'bus' : 'bus-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="search"
        options={{
          title: 'Axtarış',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'search'
                  : 'search-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hesab',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}


