import { Ionicons } from '@expo/vector-icons';
import {
    type Href,
    router,
} from 'expo-router';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUsers } from '../../api/users-api';
import { useAuth } from '../../auth/auth-context';
import {
    canManageUsers,
} from '../../auth/permissions';
import {
    getUserRoleLabel,
} from '../../features/users/user-role';
import {
    WarehouseUser,
} from '../../features/users/user-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../../theme';

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return 'Hələ daxil olmayıb';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Naməlum';
  }

  return date.toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join('');
}

type UserCardProps = {
  user: WarehouseUser;
  onPress: () => void;
};

function UserCard({
  user,
  onPress,
}: UserCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.userCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.avatar,
          !user.isActive &&
            styles.inactiveAvatar,
        ]}
      >
        <Text style={styles.avatarText}>
          {getInitials(user.fullName)}
        </Text>
      </View>

      <View style={styles.userInformation}>
        <View style={styles.userTopRow}>
          <Text
            style={styles.fullName}
            numberOfLines={1}
          >
            {user.fullName}
          </Text>

          <View
            style={[
              styles.statusBadge,
              user.isActive
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                user.isActive
                  ? styles.activeText
                  : styles.inactiveText,
              ]}
            >
              {user.isActive
                ? 'Aktiv'
                : 'Deaktiv'}
            </Text>
          </View>
        </View>

        <Text style={styles.username}>
          @{user.username}
        </Text>

        <View style={styles.userFooter}>
          <View style={styles.roleBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={colors.primary}
            />

            <Text style={styles.roleText}>
              {getUserRoleLabel(user.role)}
            </Text>
          </View>

          <Text
            style={styles.lastLogin}
            numberOfLines={1}
          >
            Son giriş:{' '}
            {formatDateTime(
              user.lastLoginAtUtc,
            )}
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textLight}
      />
    </Pressable>
  );
}

export default function UsersScreen() {
  const { session } = useAuth();

  const accessToken =
    session?.accessToken;

  const hasPermission =
    canManageUsers(session?.role);

  const [users, setUsers] =
    useState<WarehouseUser[]>([]);

  const [search, setSearch] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSearching, setIsSearching] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !hasPermission) {
      return;
    }

    let isActive = true;
    const currentAccessToken = accessToken;

    getUsers(currentAccessToken)
      .then((result) => {
        if (!isActive) {
          return;
        }

        setUsers(result);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'İşçilər alınmadı.',
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, hasPermission]);

  async function loadUsers(
    searchValue: string,
    mode: 'search' | 'refresh',
  ) {
    if (!accessToken || !hasPermission) {
      return;
    }

    if (mode === 'search') {
      setIsSearching(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const result = await getUsers(
        accessToken,
        searchValue,
      );

      setUsers(result);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'İşçilər yenilənmədi.',
      );
    } finally {
      setIsSearching(false);
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  function handleSearch() {
    void loadUsers(search.trim(), 'search');
  }

  function handleClearSearch() {
    setSearch('');
    void loadUsers('', 'search');
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.danger}
          />

          <Text style={styles.stateTitle}>
            Giriş icazəsi yoxdur
          </Text>

          <Text style={styles.stateDescription}>
            İşçiləri yalnız Admin idarə edə bilər.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Geri qayıt
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri qayıt"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerCaption}>
            ADMİN PANELİ
          </Text>

          <Text style={styles.headerTitle}>
            İşçilər
          </Text>
        </View>

        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yeni işçi yarat"
            onPress={() => {
                router.push('/create-user' as Href);
            }}
            style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
            ]}
            >
            <Ionicons
                name="person-add-outline"
                size={22}
                color={colors.white}
            />
            </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textLight}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            placeholder="Ad və ya istifadəçi adı"
            placeholderTextColor={colors.textLight}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />

          {search.length > 0 ? (
            <Pressable
              onPress={handleClearSearch}
              hitSlop={10}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textLight}
              />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          disabled={isSearching}
          onPress={handleSearch}
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.pressed,
            isSearching && styles.disabled,
          ]}
        >
          {isSearching ? (
            <ActivityIndicator
              size="small"
              color={colors.white}
            />
          ) : (
            <Ionicons
              name="search"
              size={20}
              color={colors.white}
            />
          )}
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons
            name="warning-outline"
            size={19}
            color={colors.danger}
          />

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            İşçilər açılır...
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(user) => user.id}
          renderItem={({ item }) => (
            <UserCard
                user={item}
                onPress={() => {
                router.push(
                    `/edit-user/${item.id}` as Href,
                );
                }}
            />
            )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void loadUsers(
                  search.trim(),
                  'refresh',
                );
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                İstifadəçilər
              </Text>

              <Text style={styles.resultCount}>
                {users.length} nəfər
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={44}
                color={colors.textLight}
              />

              <Text style={styles.emptyTitle}>
                İstifadəçi tapılmadı
              </Text>

              <Text style={styles.emptyDescription}>
                Axtarış məlumatlarını yenidən yoxla.
              </Text>
            </View>
          }
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },

  headerContent: {
    flex: 1,
    alignItems: 'center',
  },

  headerCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },

  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: 2,
  },

addButton: {
  width: 42,
  height: 42,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.md,
  backgroundColor: colors.primary,
},

  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },

  searchBox: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },

  searchButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
  },

  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  resultTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  resultCount: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },

  avatar: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },

  inactiveAvatar: {
    backgroundColor: colors.textLight,
  },

  avatarText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  userInformation: {
    flex: 1,
    marginLeft: spacing.md,
  },

  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  fullName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  username: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 3,
  },

  userFooter: {
    marginTop: spacing.sm,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },

  roleText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  lastLogin: {
    color: colors.textLight,
    fontSize: 11,
    marginTop: spacing.sm,
  },

  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.round,
  },

  activeBadge: {
    backgroundColor: colors.successSoft,
  },

  inactiveBadge: {
    backgroundColor: colors.dangerSoft,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  activeText: {
    color: colors.success,
  },

  inactiveText: {
    color: colors.danger,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  stateTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  stateDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: spacing.md,
  },

  emptyDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.5,
  },
});