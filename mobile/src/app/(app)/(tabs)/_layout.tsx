import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../../auth/auth-context';
import { UserRole } from '../../../auth/auth-types';
import { colors } from '../../../theme';

const legacyModulesEnabled = false;

export default function MainTabsLayout() {
  const { session } = useAuth();

  const role = session?.role;
  const isAdmin = role === UserRole.Admin;

  const canUseAccounts =
    role === UserRole.Admin ||
    role === UserRole.Manager ||
    role === UserRole.Accountant ||
    role === UserRole.Driver;

  const opensAccountsFirst =
    role === UserRole.Accountant ||
    role === UserRole.Driver;

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
          height: 68,
          paddingTop: 7,
          paddingBottom: 7,
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

