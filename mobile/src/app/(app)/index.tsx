import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import {
  DashboardApiError,
  getDashboardSummary,
  type DashboardSummary,
} from '../../api/dashboard-api';
import { useAuth } from '../../auth/auth-context';
import { DashboardMetricCard } from '../../components/dashboard-metric-card';
import { QuickActionCard } from '../../components/quick-action-card';
import { ScreenContainer } from '../../components/screen-container';
import { SectionHeader } from '../../components/section-header';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../theme';

const roleNames: Record<number, string> = {
  1: 'Menecer',
  2: 'Anbar işçisi',
  3: 'Sürücü',
};

function getInitials(fullName?: string) {
  if (!fullName) {
    return 'RC';
  }

  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

function getTodayText() {
  return new Intl.DateTimeFormat('az-AZ', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function formatUpdateTime(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getDashboardErrorMessage(
  error: unknown,
) {
  if (error instanceof DashboardApiError) {
    if (error.status === 401) {
      return 'Sessiya yenilənməlidir. Tətbiqi yenidən aç.';
    }

    return error.message;
  }

  return 'Məlumatlar alınarkən xəta baş verdi.';
}

function getSummaryDescription(
  summary: DashboardSummary | null,
) {
  if (!summary) {
    return 'Anbarın cari əməliyyat vəziyyəti';
  }

  const updateTime =
    formatUpdateTime(summary.generatedAtUtc);

  if (!updateTime) {
    return 'Anbarın cari əməliyyat vəziyyəti';
  }

  return `Son yenilənmə: ${updateTime}`;
}

export default function DashboardScreen() {
  const { session } = useAuth();

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const accessToken = session?.accessToken;

  const roleName =
    roleNames[session?.role ?? 0] ??
    'İstifadəçi';

  useEffect(() => {
    let isActive = true;

    if (!accessToken) {
      return;
    }

    const currentAccessToken = accessToken;

    async function loadInitialSummary() {
      try {
        const response =
          await getDashboardSummary(
            currentAccessToken,
          );

        if (!isActive) {
          return;
        }

        setSummary(response);
        setErrorMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          getDashboardErrorMessage(error),
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialSummary();

    return () => {
      isActive = false;
    };
  }, [accessToken]);

  async function refreshSummary() {
    if (!accessToken || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response =
        await getDashboardSummary(
          accessToken,
        );

      setSummary(response);
    } catch (error) {
      setErrorMessage(
        getDashboardErrorMessage(error),
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  const summaryDescription =
    getSummaryDescription(summary);

  return (
    <ScreenContainer
      refreshing={isRefreshing}
      onRefresh={() => {
        void refreshSummary();
      }}
    >
      <Animated.View
        entering={FadeInUp.duration(350)}
        style={styles.header}
      >
        <View style={styles.headerText}>
          <Text style={styles.brand}>
            RAM COLLECTION
          </Text>

          <Text
            style={styles.welcome}
            numberOfLines={1}
          >
            Salam, {session?.fullName}
          </Text>

          <Text style={styles.date}>
            {getTodayText()}
          </Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(session?.fullName)}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown
          .duration(350)
          .delay(80)}
        style={styles.roleCard}
      >
        <View style={styles.roleIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={colors.primary}
          />
        </View>

        <View style={styles.roleText}>
          <Text style={styles.roleLabel}>
            Aktiv hesab
          </Text>

          <Text style={styles.roleName}>
            {roleName}
          </Text>
        </View>

        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />

          <Text style={styles.onlineText}>
            Aktiv
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown
          .duration(350)
          .delay(140)}
        style={styles.section}
      >
        <SectionHeader
          title="Bugünkü vəziyyət"
          description={summaryDescription}
        />

        {errorMessage ? (
          <Pressable
            onPress={() => {
              void refreshSummary();
            }}
            style={({ pressed }) => [
              styles.errorCard,
              pressed && styles.errorPressed,
            ]}
          >
            <View style={styles.errorIcon}>
              <Ionicons
                name="warning-outline"
                size={21}
                color={colors.danger}
              />
            </View>

            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>
                Məlumatlar yenilənmədi
              </Text>

              <Text style={styles.errorDescription}>
                {errorMessage}
              </Text>
            </View>

            <Ionicons
              name="refresh"
              size={20}
              color={colors.danger}
            />
          </Pressable>
        ) : null}

        <View style={styles.metrics}>
          <DashboardMetricCard
            title="Bugünkü qaimələr"
            value={
              summary?.todayOrdersCount ?? '—'
            }
            icon="receipt-outline"
            isLoading={isLoading}
          />

          <DashboardMetricCard
            title="Hazırlanacaq"
            value={
              summary?.waitingPreparationCount ??
              '—'
            }
            icon="cube-outline"
            tone="warning"
            isLoading={isLoading}
          />

          <DashboardMetricCard
            title="Təhvil gözləyən"
            value={
              summary?.readyForDeliveryCount ??
              '—'
            }
            icon="car-outline"
            tone="success"
            isLoading={isLoading}
          />

          <DashboardMetricCard
            title="Gözləyən vazvrad"
            value={
              summary?.pendingReturnsCount ?? '—'
            }
            icon="return-down-back-outline"
            tone="danger"
            isLoading={isLoading}
          />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown
          .duration(350)
          .delay(200)}
        style={styles.section}
      >
        <SectionHeader
          title="Tez keçidlər"
          description="Ən çox istifadə edilən bölmələr"
        />

        <QuickActionCard
          title="Qaimələr"
          description="Bütün sifarişlərə və hazırlıq vəziyyətinə bax"
          icon="receipt-outline"
          onPress={() =>
            router.push('/(app)/orders')
          }
        />

        <QuickActionCard
          title="Vazvrad və vitrin"
          description="Geri qaytarılan məhsullara bax"
          icon="return-down-back-outline"
          onPress={() =>
            router.push('/(app)/returns')
          }
        />

        <QuickActionCard
          title="Ümumi axtarış"
          description="Qaimə, müştəri və məhsul kodu ilə tap"
          icon="search-outline"
          onPress={() =>
            router.push('/(app)/search')
          }
        />
      </Animated.View>

      {session?.role === 1 ? (
        <Animated.View
          entering={FadeInDown
            .duration(350)
            .delay(260)}
          style={styles.managerCard}
        >
          <View style={styles.managerIcon}>
            <Ionicons
              name="add"
              size={26}
              color={colors.white}
            />
          </View>

          <View style={styles.managerText}>
            <Text style={styles.managerTitle}>
              Yeni qaimə yarat
            </Text>

            <Text style={styles.managerDescription}>
              Bu əməliyyat yalnız menecer üçün açıqdır.
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  headerText: {
    flex: 1,
    paddingRight: spacing.md,
  },

  brand: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },

  welcome: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },

  date: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  roleText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  roleLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },

  roleName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: 2,
  },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: radius.round,
    backgroundColor: colors.success,
  },

  onlineText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  section: {
    marginTop: spacing.xxl,
  },

  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F4C5C9',
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  errorPressed: {
    opacity: 0.75,
  },

  errorIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  errorTextContainer: {
    flex: 1,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  errorDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: 2,
  },

  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },

  managerIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  managerText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  managerTitle: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  managerDescription: {
    color: '#D8E2F2',
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: 3,
  },
});