import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../theme';

const hiddenTabBarStyle = {
  display: 'none' as const,
};

export default function AppTabsLayout() {
  return (
    <Tabs
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
      {/* Əsas menyuda görünən səhifələr */}

      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana səhifə',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

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

      {/* Aşağı menyuda görünməyən səhifələr */}

      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="create-customer"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="edit-customer/[id]"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="order-detail"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="create-order"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="create-return"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="return-detail"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="order-receipt/[id]"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="users"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="create-user"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />

      <Tabs.Screen
        name="edit-user/[id]"
        options={{
          href: null,
          tabBarStyle:
            hiddenTabBarStyle,
        }}
      />
    </Tabs>
  );
}