import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useAuth } from '../../../auth/auth-context';
import {
  AdminUsersButton,
} from '../../../components/admin-users-button';
import {
  CustomersButton,
} from '../../../components/customers-button';
import {
  getUserRoleLabel,
} from '../../../features/users/user-role';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

const getInitials = (
  fullName: string,
): string => {
  const names = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return names
    .slice(0, 2)
    .map(name => name[0]?.toUpperCase())
    .join('');
};

function getAppVersion(): string {
  const version =
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '—';

  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode;

  if (!build) {
    return version;
  }

  return `${version} (${build})`;
}

export default function ProfileScreen() {
  const {
    session,
    signOut,
  } = useAuth();

  const insets = useSafeAreaInsets();

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom:
              Math.max(insets.bottom, 12) +
              spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>
          Hesab
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(
                session?.fullName ?? 'GW',
              )}
            </Text>
          </View>

          <Text style={styles.fullName}>
            {session?.fullName}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {session
                ? getUserRoleLabel(
                    session.role,
                  )
                : 'İstifadəçi'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                İstifadəçi adı
              </Text>

              <Text style={styles.detailValue}>
                {session?.username}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.success}
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Sessiya
              </Text>

              <Text style={styles.detailValue}>
                Təhlükəsiz saxlanılır
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Tətbiq versiyası
              </Text>

              <Text style={styles.detailValue}>
                {getAppVersion()}
              </Text>
            </View>
          </View>
        </View>

        <AdminUsersButton />

        <CustomersButton />

        <Pressable
          disabled={isSigningOut}
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.logoutButtonPressed,
          ]}
        >
          {isSigningOut ? (
            <ActivityIndicator
              size="small"
              color={colors.danger}
            />
          ) : (
            <Ionicons
              name="log-out-outline"
              size={21}
              color={colors.danger}
            />
          )}

          <Text style={styles.logoutText}>
            {isSigningOut
              ? 'Çıxış edilir'
              : 'Hesabdan çıx'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  pageTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },

  profileCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    marginTop: spacing.xxl,
  },

  avatar: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },

  avatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },

  fullName: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.md,
  },

  roleText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  detailsCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  detailIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  detailValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  logoutButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },

  logoutButtonPressed: {
    backgroundColor: colors.dangerSoft,
  },

  logoutText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
