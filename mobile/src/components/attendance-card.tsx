import { Ionicons } from '@expo/vector-icons';
import {
    router,
    type Href,
} from 'expo-router';
import {
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    checkInAttendance,
    checkOutAttendance,
    getMyTodayAttendance,
} from '../api/attendance-api';
import { useAuth } from '../auth/auth-context';
import {
    formatAttendanceTime,
    formatWorkedDuration,
} from '../features/attendance/attendance-time';
import type {
    AttendanceRecord,
} from '../features/attendance/attendance-types';
import {
    colors,
    fontSize,
    radius,
    spacing,
} from '../theme';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Əməliyyat zamanı xəta baş verdi.';
}

export function AttendanceCard() {
  const { session } = useAuth();

  const accessToken = session?.accessToken;

  const [attendance, setAttendance] =
    useState<AttendanceRecord | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isActionRunning, setIsActionRunning] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isActive = true;
    const currentAccessToken = accessToken;

    getMyTodayAttendance(currentAccessToken)
      .then(result => {
        if (!isActive) {
          return;
        }

        setAttendance(result);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [accessToken]);

  async function refreshAttendance() {
    if (!accessToken || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const result = await getMyTodayAttendance(
        accessToken,
      );

      setAttendance(result);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!accessToken || isActionRunning) {
      return;
    }

    setIsActionRunning(true);

    try {
      const result = await checkInAttendance(
        accessToken,
      );

      setAttendance(result);
      setErrorMessage(null);

      Alert.alert(
        'İşə giriş qeydə alındı',
        `${result.userFullName} saat ${formatAttendanceTime(
          result.checkedInAtUtc,
        )}-da işə gəldi.`,
      );
    } catch (error) {
      Alert.alert(
        'Giriş qeydə alınmadı',
        getErrorMessage(error),
      );
    } finally {
      setIsActionRunning(false);
    }
  }

  async function performCheckOut() {
    if (!accessToken || isActionRunning) {
      return;
    }

    setIsActionRunning(true);

    try {
      const result = await checkOutAttendance(
        accessToken,
      );

      setAttendance(result);
      setErrorMessage(null);

      Alert.alert(
        'İşdən çıxış qeydə alındı',
        `${result.userFullName} saat ${formatAttendanceTime(
          result.checkedOutAtUtc,
        )}-da işdən çıxdı.`,
      );
    } catch (error) {
      Alert.alert(
        'Çıxış qeydə alınmadı',
        getErrorMessage(error),
      );
    } finally {
      setIsActionRunning(false);
    }
  }

  function handleCheckOut() {
    Alert.alert(
      'İşdən çıxışı təsdiqlə',
      'Bugünkü iş vaxtını tamamlamaq istəyirsən?',
      [
        {
          text: 'Ləğv et',
          style: 'cancel',
        },
        {
          text: 'İşdən çıxdım',
          style: 'destructive',
          onPress: () => {
            void performCheckOut();
          },
        },
      ],
    );
  }

  const isAtWork =
    attendance?.isCurrentlyAtWork === true;

  const hasCompletedToday =
    attendance?.checkedOutAtUtc != null;

  const workedTime = formatWorkedDuration(
    attendance?.checkedInAtUtc,
    attendance?.checkedOutAtUtc,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            isAtWork && styles.activeIconContainer,
          ]}
        >
          <Ionicons
            name={
              isAtWork
                ? 'briefcase'
                : 'briefcase-outline'
            }
            size={22}
            color={
              isAtWork
                ? colors.success
                : colors.primary
            }
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            İş vaxtım
          </Text>

          <Text style={styles.description}>
            {isAtWork
              ? 'Hazırda işdəsən'
              : hasCompletedToday
                ? 'Bugünkü iş tamamlandı'
                : 'Bu gün giriş edilməyib'}
          </Text>
        </View>

        <Pressable
          disabled={isRefreshing}
          onPress={() => {
            void refreshAttendance();
          }}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.pressed,
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={20}
              color={colors.primary}
            />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            İş vaxtı yoxlanılır...
          </Text>
        </View>
      ) : null}

      {!isLoading && errorMessage ? (
        <Pressable
          onPress={() => {
            void refreshAttendance();
          }}
          style={styles.errorBox}
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color={colors.danger}
          />

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        </Pressable>
      ) : null}

      {!isLoading && attendance ? (
        <View style={styles.timeInformation}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>
              İşə giriş
            </Text>

            <Text style={styles.timeValue}>
              {formatAttendanceTime(
                attendance.checkedInAtUtc,
              )}
            </Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>
              İşdən çıxış
            </Text>

            <Text style={styles.timeValue}>
              {formatAttendanceTime(
                attendance.checkedOutAtUtc,
              )}
            </Text>
          </View>
        </View>
      ) : null}

      {workedTime ? (
        <View style={styles.workedTimeBox}>
          <Ionicons
            name="time-outline"
            size={17}
            color={colors.primary}
          />

          <Text style={styles.workedTimeText}>
            Bugünkü iş müddəti: {workedTime}
          </Text>
        </View>
      ) : null}

      {!isLoading && !hasCompletedToday ? (
        <Pressable
          disabled={isActionRunning}
          onPress={
            isAtWork
              ? handleCheckOut
              : () => {
                  void handleCheckIn();
                }
          }
          style={({ pressed }) => [
            styles.actionButton,
            isAtWork
              ? styles.checkOutButton
              : styles.checkInButton,
            pressed && styles.pressed,
            isActionRunning && styles.disabled,
          ]}
        >
          {isActionRunning ? (
            <ActivityIndicator
              size="small"
              color={colors.white}
            />
          ) : (
            <Ionicons
              name={
                isAtWork
                  ? 'exit-outline'
                  : 'enter-outline'
              }
              size={21}
              color={colors.white}
            />
          )}

          <Text style={styles.actionButtonText}>
            {isActionRunning
              ? 'Qeydə alınır...'
              : isAtWork
                ? 'İşdən çıxdım'
                : 'İşə gəldim'}
          </Text>
        </Pressable>
      ) : null}

      {hasCompletedToday ? (
        <View style={styles.completedBox}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.success}
          />

          <Text style={styles.completedText}>
            Bugünkü iş vaxtın tamamlanıb
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => {
          router.push('/attendance' as Href);
        }}
        style={({ pressed }) => [
          styles.detailsButton,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.detailsIcon}>
          <Ionicons
            name="people-outline"
            size={19}
            color={colors.primary}
          />
        </View>

        <View style={styles.detailsTextContainer}>
          <Text style={styles.detailsTitle}>
            Bütün işçilərin davamiyyəti
          </Text>

          <Text style={styles.detailsDescription}>
            Hamının giriş və çıxış saatlarına bax
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  activeIconContainer: {
    backgroundColor: colors.successSoft,
  },
  headerText: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },
  refreshButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.72,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  timeInformation: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  timeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  timeValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  workedTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  workedTimeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  actionButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  checkInButton: {
    backgroundColor: colors.success,
  },
  checkOutButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.55,
  },
  completedBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    marginTop: spacing.lg,
  },
  completedText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  detailsButton: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  detailsIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  detailsTextContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  detailsTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  detailsDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
  },
});