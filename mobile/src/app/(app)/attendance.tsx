import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getAttendanceRecords,
} from '../../api/attendance-api';
import { useAuth } from '../../auth/auth-context';
import {
  formatAttendanceTime,
  formatWorkedDuration,
} from '../../features/attendance/attendance-time';
import type {
  AttendanceRecord,
} from '../../features/attendance/attendance-types';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../theme';

function getDateKey(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function changeDate(
  date: Date,
  dayDifference: number,
): Date {
  const nextDate = new Date(date);

  nextDate.setDate(
    nextDate.getDate() + dayDifference,
  );

  return nextDate;
}

function formatDate(dateValue: string): string {
  const parts = dateValue
    .split('-')
    .map(Number);

  const date = new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
  );

  return new Intl.DateTimeFormat('az-AZ', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Davamiyyət məlumatları alınmadı.';
}

export default function AttendanceScreen() {
  const { session } = useAuth();

  const accessToken = session?.accessToken;

  const [selectedDate, setSelectedDate] =
    useState(() => new Date());

  const [search, setSearch] = useState('');

  const [records, setRecords] =
    useState<readonly AttendanceRecord[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const selectedDateKey = getDateKey(selectedDate);
  const todayDateKey = getDateKey(new Date());

  const isTodaySelected =
    selectedDateKey === todayDateKey;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isActive = true;
    const currentAccessToken = accessToken;

    const timeoutId = setTimeout(() => {
      getAttendanceRecords(
        currentAccessToken,
        {
          search: search.trim() || undefined,
          fromDate: selectedDateKey,
          toDate: selectedDateKey,
          pageNumber: 1,
          pageSize: 100,
        },
      )
        .then(result => {
          if (!isActive) {
            return;
          }

          setRecords(result.items);
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
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [
    accessToken,
    search,
    selectedDateKey,
  ]);

  async function refreshData() {
    if (!accessToken || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const result = await getAttendanceRecords(
        accessToken,
        {
          search: search.trim() || undefined,
          fromDate: selectedDateKey,
          toDate: selectedDateKey,
          pageNumber: 1,
          pageSize: 100,
        },
      );

      setRecords(result.items);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  function selectPreviousDay() {
    setIsLoading(true);
    setSelectedDate(currentDate =>
      changeDate(currentDate, -1),
    );
  }

  function selectNextDay() {
    if (isTodaySelected) {
      return;
    }

    setIsLoading(true);
    setSelectedDate(currentDate =>
      changeDate(currentDate, 1),
    );
  }

  function selectToday() {
    if (isTodaySelected) {
      return;
    }

    setIsLoading(true);
    setSelectedDate(new Date());
  }

  const currentlyAtWorkCount = records.filter(
    record => record.isCurrentlyAtWork,
  ).length;

  const checkedOutCount = records.filter(
    record => Boolean(record.checkedOutAtUtc),
  ).length;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refreshData();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={styles.header}
        >
          <Pressable
            onPress={() => {
              router.back();
            }}
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

          <View style={styles.headerText}>
            <Text style={styles.pageEyebrow}>
              RAM COLLECTION
            </Text>

            <Text style={styles.pageTitle}>
              İşçilərin davamiyyəti
            </Text>
          </View>

          <Pressable
            disabled={isRefreshing}
            onPress={() => {
              void refreshData();
            }}
            style={({ pressed }) => [
              styles.headerRefresh,
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
                size={21}
                color={colors.primary}
              />
            )}
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeInDown
            .duration(350)
            .delay(60)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeading}>
            <View>
              <Text style={styles.summaryLabel}>
                Seçilmiş tarix
              </Text>

              <Text style={styles.summaryDate}>
                {formatDate(selectedDateKey)}
              </Text>
            </View>

            {isTodaySelected ? (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>
                  Bu gün
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNumber}>
                {records.length}
              </Text>

              <Text style={styles.summaryStatLabel}>
                Ümumi qeyd
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStat}>
              <Text style={styles.summaryNumber}>
                {currentlyAtWorkCount}
              </Text>

              <Text style={styles.summaryStatLabel}>
                Hazırda işdə
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStat}>
              <Text style={styles.summaryNumber}>
                {checkedOutCount}
              </Text>

              <Text style={styles.summaryStatLabel}>
                İşdən çıxıb
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown
            .duration(350)
            .delay(110)}
          style={styles.filtersCard}
        >
          <View style={styles.dateSelector}>
            <Pressable
              onPress={selectPreviousDay}
              style={({ pressed }) => [
                styles.dateButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={21}
                color={colors.primary}
              />
            </Pressable>

            <Pressable
              onPress={selectToday}
              style={styles.selectedDate}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
              />

              <Text style={styles.selectedDateText}>
                {isTodaySelected
                  ? 'Bu gün'
                  : formatDate(selectedDateKey)}
              </Text>
            </Pressable>

            <Pressable
              disabled={isTodaySelected}
              onPress={selectNextDay}
              style={({ pressed }) => [
                styles.dateButton,
                isTodaySelected &&
                  styles.dateButtonDisabled,
                pressed &&
                  !isTodaySelected &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={21}
                color={
                  isTodaySelected
                    ? colors.textLight
                    : colors.primary
                }
              />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textSecondary}
            />

            <TextInput
              value={search}
              onChangeText={value => {
                setIsLoading(true);
                setSearch(value);
              }}
              placeholder="İşçinin adını və ya istifadəçi adını axtar"
              placeholderTextColor={colors.textLight}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {search ? (
              <Pressable
                onPress={() => {
                  setIsLoading(true);
                  setSearch('');
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>
              Giriş və çıxışlar
            </Text>

            <Text style={styles.listDescription}>
              Bütün işçilərin seçilmiş tarix üzrə məlumatı
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {records.length}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <Pressable
            onPress={() => {
              void refreshData();
            }}
            style={styles.errorCard}
          >
            <Ionicons
              name="warning-outline"
              size={22}
              color={colors.danger}
            />

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Məlumatlar alınmadı
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>

            <Ionicons
              name="refresh-outline"
              size={20}
              color={colors.danger}
            />
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Davamiyyət məlumatları alınır...
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        records.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Davamiyyət qeydi yoxdur
            </Text>

            <Text style={styles.emptyDescription}>
              Bu tarixdə heç bir işçinin giriş və ya çıxış qeydi tapılmadı.
            </Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage
          ? records.map((record, index) => {
              const workedDuration =
                formatWorkedDuration(
                  record.checkedInAtUtc,
                  record.checkedOutAtUtc,
                );

              return (
                <Animated.View
                  key={record.id}
                  entering={FadeInDown
                    .duration(280)
                    .delay(
                      Math.min(index * 35, 280),
                    )}
                  style={styles.recordCard}
                >
                  <View style={styles.recordTopRow}>
                    <View style={styles.avatar}>
                      <Ionicons
                        name="person-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.recordIdentity}>
                      <Text
                        style={styles.recordName}
                        numberOfLines={1}
                      >
                        {record.userFullName}
                      </Text>

                      <Text style={styles.recordDate}>
                        {formatDate(record.workDate)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        record.isCurrentlyAtWork
                          ? styles.workingBadge
                          : styles.completedBadge,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          record.isCurrentlyAtWork
                            ? styles.workingDot
                            : styles.completedDot,
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          record.isCurrentlyAtWork
                            ? styles.workingText
                            : styles.completedText,
                        ]}
                      >
                        {record.isCurrentlyAtWork
                          ? 'İşdədir'
                          : 'İşdən çıxıb'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordTimes}>
                    <View style={styles.recordTimeItem}>
                      <View
                        style={[
                          styles.timeIcon,
                          styles.checkInIcon,
                        ]}
                      >
                        <Ionicons
                          name="enter-outline"
                          size={18}
                          color={colors.success}
                        />
                      </View>

                      <View>
                        <Text style={styles.timeLabel}>
                          İşə giriş
                        </Text>

                        <Text style={styles.timeValue}>
                          {formatAttendanceTime(
                            record.checkedInAtUtc,
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordTimeDivider} />

                    <View style={styles.recordTimeItem}>
                      <View
                        style={[
                          styles.timeIcon,
                          styles.checkOutIcon,
                        ]}
                      >
                        <Ionicons
                          name="exit-outline"
                          size={18}
                          color={colors.danger}
                        />
                      </View>

                      <View>
                        <Text style={styles.timeLabel}>
                          İşdən çıxış
                        </Text>

                        <Text style={styles.timeValue}>
                          {formatAttendanceTime(
                            record.checkedOutAtUtc,
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.durationRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.textSecondary}
                    />

                    <Text style={styles.durationText}>
                      {workedDuration
                        ? `İş müddəti: ${workedDuration}`
                        : 'İş müddəti hələ tamamlanmayıb'}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          : null}
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
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
  },
  pageEyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: 2,
  },
  headerRefresh: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.72,
  },
  summaryCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    backgroundColor: colors.primaryDark,
    marginTop: spacing.xl,
  },
  summaryHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    color: '#AFC0D6',
    fontSize: fontSize.xs,
  },
  summaryDate: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  todayBadge: {
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  todayBadgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.xl,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  summaryStatLabel: {
    color: '#AFC0D6',
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#345476',
    marginHorizontal: spacing.sm,
  },
  filtersCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  dateSelector: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  dateButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonDisabled: {
    opacity: 0.4,
  },
  selectedDate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  selectedDateText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  searchContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
  },
  listTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  listDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  countBadge: {
    minWidth: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  countText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xxl,
    marginTop: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  recordCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  recordIdentity: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  recordName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  recordDate: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  workingBadge: {
    backgroundColor: colors.successSoft,
  },
  completedBadge: {
    backgroundColor: colors.primarySoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.round,
  },
  workingDot: {
    backgroundColor: colors.success,
  },
  completedDot: {
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  workingText: {
    color: colors.success,
  },
  completedText: {
    color: colors.primary,
  },
  recordTimes: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  recordTimeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  recordTimeDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  timeIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  checkInIcon: {
    backgroundColor: colors.successSoft,
  },
  checkOutIcon: {
    backgroundColor: colors.dangerSoft,
  },
  timeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  timeValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});