import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/auth-context';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../theme';

const getRoleName = (
  role: number,
): string => {
  switch (role) {
    case 1:
      return 'Menecer';

    case 2:
      return 'Anbar işçisi';

    case 3:
      return 'Sürücü';

    default:
      return 'İstifadəçi';
  }
};

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

export default function ProfileScreen() {
  const {
    session,
    signOut,
  } = useAuth();

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>
          Hesab
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(
                session?.fullName ?? 'RC',
              )}
            </Text>
          </View>

          <Text style={styles.fullName}>
            {session?.fullName}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {getRoleName(
                session?.role ?? 0,
              )}
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
        </View>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    padding: spacing.xl,
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
    backgroundColor:
      colors.primarySoft,
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
    backgroundColor:
      colors.primarySoft,
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
    marginTop: 'auto',
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