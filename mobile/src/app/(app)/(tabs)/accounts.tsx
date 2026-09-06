import { Ionicons } from '@expo/vector-icons';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  correctPreviousDebt,
  createCustomerAccount,
  getCustomerAccountDetails,
  getCustomerAccounts,
  recordCustomerPayment,
} from '../../../api/customer-account-api';
import { useAuth } from '../../../auth/auth-context';
import { UserRole } from '../../../auth/auth-types';
import { useAppToast } from '../../../components/app-toast';
import {
  CustomerAccountDay,
  CustomerAccountDetails,
  CustomerAccountEntryType,
  CustomerAccountSummary,
} from '../../../features/customer-accounts/customer-account-types';
import { useResponsiveLayout } from '../../../hooks/use-responsive-layout';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

const BAKU_OFFSET_MILLISECONDS =
  4 * 60 * 60 * 1000;

function getTodayKey(): string {
  const bakuDate = new Date(
    Date.now() + BAKU_OFFSET_MILLISECONDS,
  );

  const year = bakuDate.getUTCFullYear();
  const month = String(
    bakuDate.getUTCMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    bakuDate.getUTCDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function shiftDateKey(
  dateKey: string,
  amount: number,
): string {
  const [year, month, day] =
    dateKey.split('-').map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day + amount),
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(dateKey: string): string {
  const [year, month, day] =
    dateKey.split('-');

  return `${day}.${month}.${year}`;
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} AZN`;
}

function getEntryLabel(
  entryType: CustomerAccountEntryType,
): string {
  switch (entryType) {
    case CustomerAccountEntryType.OpeningBalance:
      return 'İlkin köhnə borc';
    case CustomerAccountEntryType.Debt:
      return 'Gündəlik borc';
    case CustomerAccountEntryType.Payment:
      return 'Ödəniş';
    case CustomerAccountEntryType.AdjustmentIncrease:
      return 'Borc artımı düzəlişi';
    case CustomerAccountEntryType.AdjustmentDecrease:
      return 'Borc azalması düzəlişi';
    default:
      return 'Əməliyyat';
  }
}

function isNegativeEntry(
  entryType: CustomerAccountEntryType,
): boolean {
  return (
    entryType === CustomerAccountEntryType.Payment ||
    entryType ===
      CustomerAccountEntryType.AdjustmentDecrease
  );
}

function parseAmount(value: string): number {
  return Number(
    value.trim().replace(',', '.'),
  );
}

type AccountAction =
  | 'debt'
  | 'payment'
  | 'correction';

type CustomerCardProps = {
  account: CustomerAccountSummary;
  selected: boolean;
  onPress: () => void;
};

function CustomerCard({
  account,
  selected,
  onPress,
}: CustomerCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.customerCard,
        selected && styles.selectedCustomerCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.customerTopRow}>
        <View style={styles.customerIcon}>
          <Ionicons
            name="person-outline"
            size={20}
            color={colors.primary}
          />
        </View>

        <View style={styles.customerNameContainer}>
          <Text
            style={styles.customerName}
            numberOfLines={1}
          >
            {account.customerName}
          </Text>

          <Text style={styles.customerPhone}>
            {account.phoneNumber || 'Telefon yoxdur'}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color={colors.textLight}
        />
      </View>

      <View style={styles.cardDebtRow}>
        <View style={styles.cardDebtItem}>
          <Text style={styles.cardDebtLabel}>
            Günlük borc
          </Text>
          <Text style={styles.cardDebtValue}>
            {formatMoney(account.todayDebt)}
          </Text>
        </View>

        <View style={styles.cardDebtItem}>
          <Text style={styles.cardDebtLabel}>
            Bu gün ödənilib
          </Text>
          <Text style={styles.cardPaymentValue}>
            {formatMoney(account.todayPayment)}
          </Text>
        </View>

        <View style={styles.cardDebtItem}>
          <Text style={styles.cardDebtLabel}>
            Köhnədən qalan
          </Text>
          <Text style={styles.cardDebtValue}>
            {formatMoney(
              account.previousDebtRemaining,
            )}
          </Text>
        </View>

        <View style={styles.cardDebtItem}>
          <Text style={styles.cardDebtLabel}>
            Ümumi qalıq
          </Text>
          <Text
            style={[
              styles.cardRemainingValue,
              account.remainingDebt <= 0 &&
                styles.paidRemainingValue,
            ]}
          >
            {formatMoney(account.remainingDebt)}
          </Text>
        </View>
      </View>

      {account.todayDebt > 0 &&
      account.remainingDebt <= 0 ? (
        <View style={styles.paidNotice}>
          <Ionicons
            name="checkmark-circle"
            size={17}
            color={colors.success}
          />
          <Text style={styles.paidNoticeText}>
            Tam ödənilib · sabah aktiv siyahıda görünməyəcək
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function HistoryDay({
  day,
}: {
  day: CustomerAccountDay;
}) {
  return (
    <View style={styles.historyDay}>
      <View style={styles.historyDayHeader}>
        <Text style={styles.historyDate}>
          {formatDate(day.businessDate)}
        </Text>

        <Text style={styles.historyClosingDebt}>
          Qalıq: {formatMoney(day.closingDebt)}
        </Text>
      </View>

      <View style={styles.historySummaryGrid}>
        <View style={styles.historySummaryItem}>
          <Text style={styles.historySummaryLabel}>
            Günün əvvəli
          </Text>
          <Text style={styles.historySummaryValue}>
            {formatMoney(day.openingDebt)}
          </Text>
        </View>

        <View style={styles.historySummaryItem}>
          <Text style={styles.historySummaryLabel}>
            Günlük borc
          </Text>
          <Text style={styles.historySummaryDebt}>
            +{formatMoney(day.addedDebt)}
          </Text>
        </View>

        <View style={styles.historySummaryItem}>
          <Text style={styles.historySummaryLabel}>
            Ödənilən
          </Text>
          <Text style={styles.historySummaryPaid}>
            −{formatMoney(day.paidAmount)}
          </Text>
        </View>

        <View style={styles.historySummaryItem}>
          <Text style={styles.historySummaryLabel}>
            Gün sonu
          </Text>
          <Text style={styles.historySummaryClosing}>
            {formatMoney(day.closingDebt)}
          </Text>
        </View>
      </View>

      {day.adjustmentAmount !== 0 ? (
        <View style={styles.adjustmentNotice}>
          <Ionicons
            name="create-outline"
            size={16}
            color={colors.warning}
          />
          <Text style={styles.adjustmentNoticeText}>
            Köhnə borc düzəlişi:{' '}
            {day.adjustmentAmount > 0 ? '+' : '−'}
            {formatMoney(Math.abs(day.adjustmentAmount))}
          </Text>
        </View>
      ) : null}

      {day.entries.map((entry) => {
        const negative = isNegativeEntry(
          entry.entryType,
        );

        return (
          <View
            key={entry.id}
            style={styles.historyEntry}
          >
            <View
              style={[
                styles.historyEntryIcon,
                negative
                  ? styles.negativeEntryIcon
                  : styles.positiveEntryIcon,
              ]}
            >
              <Ionicons
                name={
                  negative
                    ? 'arrow-down-outline'
                    : 'arrow-up-outline'
                }
                size={16}
                color={
                  negative
                    ? colors.success
                    : colors.warning
                }
              />
            </View>

            <View style={styles.historyEntryText}>
              <Text style={styles.historyEntryTitle}>
                {getEntryLabel(entry.entryType)}
              </Text>

              <Text style={styles.historyEntryMeta}>
                {entry.recordedByFullName}
                {entry.note ? ` · ${entry.note}` : ''}
              </Text>
            </View>

            <Text
              style={[
                styles.historyEntryAmount,
                negative
                  ? styles.negativeAmount
                  : styles.positiveAmount,
              ]}
            >
              {negative ? '−' : '+'}
              {formatMoney(entry.amount)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type AccountDetailsContentProps = {
  details: CustomerAccountDetails | null;
  summary: CustomerAccountSummary | null;
  isLoading: boolean;
  actionsEnabled: boolean;
  canAddDebt: boolean;
  canPay: boolean;
  canCorrect: boolean;
  onAction: (action: AccountAction) => void;
};

function AccountDetailsContent({
  details,
  summary,
  isLoading,
  actionsEnabled,
  canAddDebt,
  canPay,
  canCorrect,
  onAction,
}: AccountDetailsContentProps) {
  if (isLoading) {
    return (
      <View style={styles.detailState}>
        <ActivityIndicator
          size="small"
          color={colors.primary}
        />
        <Text style={styles.detailStateText}>
          Açot yüklənir...
        </Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.detailState}>
        <Ionicons
          name="receipt-outline"
          size={48}
          color={colors.textLight}
        />
        <Text style={styles.detailStateTitle}>
          Müştəri seç
        </Text>
        <Text style={styles.detailStateText}>
          Tam borc və ödəniş tarixçəsinə baxmaq üçün
          siyahıdan müştəri seç.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailsHeader}>
        <View style={styles.detailsAvatar}>
          <Ionicons
            name="person"
            size={25}
            color={colors.white}
          />
        </View>

        <View style={styles.detailsHeaderText}>
          <Text style={styles.detailsName}>
            {details.customerName}
          </Text>
          <Text style={styles.detailsPhone}>
            {details.phoneNumber || 'Telefon yoxdur'}
          </Text>
        </View>
      </View>

      <View style={styles.balanceGrid}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Günlük borc
          </Text>
          <Text style={styles.balanceValue}>
            {formatMoney(summary?.todayDebt ?? 0)}
          </Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Bu gün ödənilib
          </Text>
          <Text style={styles.balancePaidValue}>
            {formatMoney(summary?.todayPayment ?? 0)}
          </Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Köhnədən qalan
          </Text>
          <Text style={styles.balanceValue}>
            {formatMoney(
              summary?.previousDebtRemaining ?? 0,
            )}
          </Text>
        </View>

        <View
          style={[
            styles.balanceCard,
            styles.remainingBalanceCard,
          ]}
        >
          <Text style={styles.remainingBalanceLabel}>
            Qalıq borc
          </Text>
          <Text style={styles.remainingBalanceValue}>
            {formatMoney(
              summary?.remainingDebt ??
                details.remainingDebt,
            )}
          </Text>
        </View>
      </View>

      {actionsEnabled ? (
        <View style={styles.actionGrid}>
          {canAddDebt ? (
            <Pressable
              onPress={() => onAction('debt')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.debtActionButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.white}
              />
              <Text style={styles.actionButtonText}>
                Gündəlik borc
              </Text>
            </Pressable>
          ) : null}

          {canPay ? (
            <Pressable
              onPress={() => onAction('payment')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.paymentActionButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={colors.white}
              />
              <Text style={styles.actionButtonText}>
                Ödəniş yaz
              </Text>
            </Pressable>
          ) : null}

          {canCorrect && details.days.length > 0 ? (
            <Pressable
              onPress={() => onAction('correction')}
              style={({ pressed }) => [
                styles.correctionButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color={colors.warning}
              />
              <Text style={styles.correctionButtonText}>
                Köhnə borcu düzəlt
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.actionDateNotice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.primary}
          />
          <Text style={styles.actionDateNoticeText}>
            Yeni əməliyyat yazmaq üçün “Bu gün” tarixinə qayıt.
          </Text>
        </View>
      )}

      <View style={styles.historyTitleRow}>
        <Text style={styles.historyTitle}>
          Əməliyyat tarixçəsi
        </Text>
        <Text style={styles.historyCount}>
          {details.days.length} gün
        </Text>
      </View>

      {details.days.length > 0 ? (
        details.days.map((day) => (
          <HistoryDay
            key={day.businessDate}
            day={day}
          />
        ))
      ) : (
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryText}>
            Bu müştəri üçün açot əməliyyatı yoxdur.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function AccountsScreen() {
  const { session } = useAuth();
  const { showToast } = useAppToast();
  const { isTablet, horizontalPadding } =
    useResponsiveLayout();

  const accessToken = session?.accessToken;
  const todayKey = useMemo(() => getTodayKey(), []);

  const [selectedDate, setSelectedDate] =
    useState(todayKey);
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] =
    useState<CustomerAccountSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);
  const [details, setDetails] =
    useState<CustomerAccountDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailLoading, setIsDetailLoading] =
    useState(false);
  const [phoneDetailsVisible, setPhoneDetailsVisible] =
    useState(false);
  const [action, setAction] =
    useState<AccountAction | null>(null);
  const [todayDebt, setTodayDebt] = useState('');
  const [initialDebt, setInitialDebt] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [correctedDebt, setCorrectedDebt] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const role = session?.role;
  const isDriver = role === UserRole.Driver;
  const canAddDebt =
    role === UserRole.Admin ||
    role === UserRole.Manager ||
    role === UserRole.Ram;
  const canPay =
    role === UserRole.Admin ||
    role === UserRole.Manager ||
    role === UserRole.Driver;
  const canCorrect = canAddDebt;
  const actionsEnabled = selectedDate === todayKey;

  const loadAccounts = useCallback(
    async (refreshing = false) => {
      if (!accessToken) {
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await getCustomerAccounts(
          accessToken,
          {
            search,
            date: selectedDate,
            pageNumber: 1,
            pageSize: 100,
          },
        );

        const visibleItems = isDriver
          ? response.items.filter(
              (item) =>
                item.todayDebt > 0 ||
                item.remainingDebt > 0,
            )
          : response.items;

        setAccounts(visibleItems);

        setSelectedCustomerId((currentId) => {
          if (
            currentId &&
            visibleItems.some(
              (item) => item.customerId === currentId,
            )
          ) {
            return currentId;
          }

          return isTablet
            ? visibleItems[0]?.customerId ?? null
            : null;
        });
      } catch (error) {
        showToast({
          title: 'Açot yüklənmədi',
          message:
            error instanceof Error
              ? error.message
              : 'Gözlənilməz xəta baş verdi.',
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, [
      accessToken,
      isDriver,
      isTablet,
      search,
      selectedDate,
      showToast,
    ],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadAccounts();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadAccounts]);

  useEffect(() => {
    if (!accessToken || !selectedCustomerId) {
      return;
    }

    let active = true;

    getCustomerAccountDetails(
      accessToken,
      selectedCustomerId,
    )
      .then((response) => {
        if (active) {
          setDetails(response);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        showToast({
          title: 'Tarixçə yüklənmədi',
          message:
            error instanceof Error
              ? error.message
              : 'Gözlənilməz xəta baş verdi.',
          variant: 'error',
        });
      })
      .finally(() => {
        if (active) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    selectedCustomerId,
    showToast,
  ]);

  const totalRemainingDebt = useMemo(
    () =>
      accounts.reduce(
        (total, account) =>
          total + account.remainingDebt,
        0,
      ),
    [accounts],
  );

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          account.customerId === selectedCustomerId,
      ) ?? null,
    [accounts, selectedCustomerId],
  );

  const driverSections = useMemo(
    () =>
      [
        {
          title: 'Bugünkü borclar',
          subtitle: 'RAM tərəfindən bu gün yazılanlar',
          data: accounts.filter(
            (account) => account.todayDebt > 0,
          ),
        },
        {
          title: 'Digər borclar',
          subtitle: 'Əvvəlki günlərdən qalan borclar',
          data: accounts.filter(
            (account) =>
              account.todayDebt <= 0 &&
              account.remainingDebt > 0,
          ),
        },
      ].filter((section) => section.data.length > 0),
    [accounts],
  );

  function selectCustomer(
    customerId: string,
  ) {
    setDetails(null);
    setIsDetailLoading(true);
    setSelectedCustomerId(customerId);

    if (!isTablet) {
      setPhoneDetailsVisible(true);
    }
  }

  function openAction(nextAction: AccountAction) {
    if (!details) {
      return;
    }

    setTodayDebt('');
    setInitialDebt('');
    setPaymentAmount('');
    setCorrectedDebt(
      String(details.previousDebt),
    );
    setNote('');
    setReason('');
    setAction(nextAction);
  }

  async function submitAction() {
    if (
      !accessToken ||
      !details ||
      !action ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      let response: CustomerAccountDetails;
      let successMessage: string;

      if (action === 'debt') {
        const parsedTodayDebt = todayDebt.trim()
          ? parseAmount(todayDebt)
          : 0;
        const parsedInitialDebt = initialDebt.trim()
          ? parseAmount(initialDebt)
          : null;

        if (
          !Number.isFinite(parsedTodayDebt) ||
          parsedTodayDebt < 0
        ) {
          throw new Error(
            'Bugünkü borcu düzgün daxil edin.',
          );
        }

        if (
          parsedInitialDebt !== null &&
          (!Number.isFinite(parsedInitialDebt) ||
            parsedInitialDebt < 0)
        ) {
          throw new Error(
            'İlkin köhnə borcu düzgün daxil edin.',
          );
        }

        if (
          parsedTodayDebt === 0 &&
          (parsedInitialDebt ?? 0) === 0
        ) {
          throw new Error(
            'Bugünkü və ya ilkin borcdan birini daxil edin.',
          );
        }

        response = await createCustomerAccount(
          accessToken,
          {
            customerId: details.customerId,
            initialPreviousDebt: parsedInitialDebt,
            todayDebt: parsedTodayDebt,
            note: note.trim() || null,
          },
        );

        successMessage =
          'Bugünkü borc açota əlavə edildi.';
      } else if (action === 'payment') {
        const parsedPayment =
          parseAmount(paymentAmount);

        if (
          !Number.isFinite(parsedPayment) ||
          parsedPayment <= 0
        ) {
          throw new Error(
            'Alınan ödənişi düzgün daxil edin.',
          );
        }

        response = await recordCustomerPayment(
          accessToken,
          {
            customerId: details.customerId,
            amount: parsedPayment,
            note: note.trim() || null,
          },
        );

        successMessage =
          'Ödəniş qeydə alındı və borcdan çıxıldı.';
      } else {
        if (details.days.length === 0) {
          throw new Error(
            'Əvvəlcə müştərinin ilk hesabını yaradın.',
          );
        }

        const parsedCorrection =
          parseAmount(correctedDebt);

        if (
          !Number.isFinite(parsedCorrection) ||
          parsedCorrection < 0
        ) {
          throw new Error(
            'Düzəldilmiş köhnə borcu düzgün daxil edin.',
          );
        }

        if (reason.trim().length < 3) {
          throw new Error(
            'Düzəliş səbəbini daxil edin.',
          );
        }

        response = await correctPreviousDebt(
          accessToken,
          {
            customerId: details.customerId,
            correctedPreviousDebt: parsedCorrection,
            reason: reason.trim(),
          },
        );

        successMessage =
          'Köhnə borc düzəlişi tarixçəyə yazıldı.';
      }

      setDetails(response);
      setAction(null);

      showToast({
        title: 'Əməliyyat uğurludur',
        message: successMessage,
        variant: 'success',
      });

      void loadAccounts();
    } catch (error) {
      showToast({
        title: 'Əməliyyat tamamlanmadı',
        message:
          error instanceof Error
            ? error.message
            : 'Gözlənilməz xəta baş verdi.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const emptyList = isLoading ? (
    <View style={styles.emptyState}>
      <ActivityIndicator
        size="small"
        color={colors.primary}
      />
      <Text style={styles.emptyStateText}>
        Müştərilər yüklənir...
      </Text>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Ionicons
        name="search-outline"
        size={46}
        color={colors.textLight}
      />
      <Text style={styles.emptyStateTitle}>
        {isDriver
          ? 'Ödənilməmiş borc tapılmadı'
          : 'Müştəri tapılmadı'}
      </Text>
      <Text style={styles.emptyStateText}>
        {isDriver
          ? 'Bu tarix üçün bugünkü və ya əvvəlki günlərdən qalan borc yoxdur.'
          : 'Axtarış sözünü dəyişərək yenidən yoxla.'}
      </Text>
    </View>
  );

  const commonRefreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      tintColor={colors.primary}
      onRefresh={() => {
        void loadAccounts(true);
      }}
    />
  );

  const listContent = isDriver ? (
    <SectionList
      sections={driverSections}
      keyExtractor={(item) => item.customerId}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={
        driverSections.length === 0
          ? styles.emptyListContent
          : styles.listContent
      }
      refreshControl={commonRefreshControl}
      ListEmptyComponent={emptyList}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {section.subtitle}
            </Text>
          </View>
          <Text style={styles.sectionCount}>
            {section.data.length}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <CustomerCard
          account={item}
          selected={
            item.customerId === selectedCustomerId
          }
          onPress={() => {
            selectCustomer(item.customerId);
          }}
        />
      )}
    />
  ) : (
    <FlatList
      data={accounts}
      keyExtractor={(item) => item.customerId}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={
        accounts.length === 0
          ? styles.emptyListContent
          : styles.listContent
      }
      refreshControl={commonRefreshControl}
      ListEmptyComponent={emptyList}
      renderItem={({ item }) => (
        <CustomerCard
          account={item}
          selected={
            item.customerId === selectedCustomerId
          }
          onPress={() => {
            selectCustomer(item.customerId);
          }}
        />
      )}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.page,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.brand}>
              RAM COLLECTION
            </Text>
            <Text style={styles.pageTitle}>
              Müştəri açotları
            </Text>
          </View>

          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>
              Ümumi qalıq
            </Text>
            <Text style={styles.totalBadgeValue}>
              {formatMoney(totalRemainingDebt)}
            </Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textLight}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Müştəri adı və ya telefon..."
              placeholderTextColor={colors.textLight}
              autoCorrect={false}
              style={styles.searchInput}
            />
            {search ? (
              <Pressable
                hitSlop={10}
                onPress={() => setSearch('')}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textLight}
                />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.dateBar}>
            <Pressable
              onPress={() => {
                setSelectedDate((currentDate) =>
                  shiftDateKey(currentDate, -1),
                );
              }}
              style={styles.dateButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.primary}
              />
            </Pressable>

            <Pressable
              onPress={() => setSelectedDate(todayKey)}
              style={styles.dateValue}
            >
              <Text style={styles.dateValueText}>
                {selectedDate === todayKey
                  ? 'Bu gün'
                  : formatDate(selectedDate)}
              </Text>
            </Pressable>

            <Pressable
              disabled={selectedDate === todayKey}
              onPress={() => {
                setSelectedDate((currentDate) =>
                  shiftDateKey(currentDate, 1),
                );
              }}
              style={[
                styles.dateButton,
                selectedDate === todayKey &&
                  styles.disabledButton,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        {isTablet ? (
          <View style={styles.tabletBody}>
            <View style={styles.tabletListPanel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>
                  Müştərilər
                </Text>
                <Text style={styles.panelCount}>
                  {accounts.length}
                </Text>
              </View>
              {listContent}
            </View>

            <View style={styles.tabletDetailPanel}>
              <AccountDetailsContent
                details={details}
                summary={selectedAccount}
                isLoading={isDetailLoading}
                actionsEnabled={actionsEnabled}
                canAddDebt={canAddDebt}
                canPay={canPay}
                canCorrect={canCorrect}
                onAction={openAction}
              />
            </View>
          </View>
        ) : (
          <View style={styles.phoneList}>
            {listContent}
          </View>
        )}
      </View>

      <Modal
        visible={
          !isTablet && phoneDetailsVisible
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPhoneDetailsVisible(false);
        }}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                setPhoneDetailsVisible(false);
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color={colors.text}
              />
            </Pressable>

            <Text style={styles.modalTitle}>
              Açot detalları
            </Text>

            <View style={styles.modalPlaceholder} />
          </View>

          <AccountDetailsContent
            details={details}
            summary={selectedAccount}
            isLoading={isDetailLoading}
            actionsEnabled={actionsEnabled}
            canAddDebt={canAddDebt}
            canPay={canPay}
            canCorrect={canCorrect}
            onAction={openAction}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={action !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) {
            setAction(null);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={styles.actionModalLayer}
        >
          <Pressable
            style={styles.actionModalBackdrop}
            onPress={() => {
              if (!isSubmitting) {
                setAction(null);
              }
            }}
          />

          <View style={styles.actionModalCard}>
            <View style={styles.actionModalHeader}>
              <View>
                <Text style={styles.actionModalCaption}>
                  {details?.customerName}
                </Text>
                <Text style={styles.actionModalTitle}>
                  {action === 'debt'
                    ? 'Gündəlik borc əlavə et'
                    : action === 'payment'
                      ? 'Ödənişi qeydə al'
                      : 'Köhnə borcu düzəlt'}
                </Text>
              </View>

              <Pressable
                disabled={isSubmitting}
                onPress={() => setAction(null)}
                style={styles.actionModalClose}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {action === 'debt' ? (
              <>
                <Text style={styles.formLabel}>
                  Bugünkü borc
                </Text>
                <TextInput
                  value={todayDebt}
                  onChangeText={setTodayDebt}
                  editable={!isSubmitting}
                  keyboardType="decimal-pad"
                  placeholder="Məsələn: 200"
                  placeholderTextColor={colors.textLight}
                  style={styles.formInput}
                />

                {details?.days.length === 0 ? (
                  <>
                    <Text style={styles.formLabel}>
                      İlkin köhnə borc — yalnız ilk dəfə
                    </Text>
                    <TextInput
                      value={initialDebt}
                      onChangeText={setInitialDebt}
                      editable={!isSubmitting}
                      keyboardType="decimal-pad"
                      placeholder="Məsələn: 300"
                      placeholderTextColor={colors.textLight}
                      style={styles.formInput}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {action === 'payment' ? (
              <>
                <Text style={styles.formLabel}>
                  Alınan ödəniş
                </Text>
                <TextInput
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  editable={!isSubmitting}
                  keyboardType="decimal-pad"
                  placeholder="Məsələn: 200"
                  placeholderTextColor={colors.textLight}
                  style={styles.formInput}
                />

                <Text style={styles.formHint}>
                  Cari qalıq: {formatMoney(
                    details?.remainingDebt ?? 0,
                  )}
                </Text>
              </>
            ) : null}

            {action === 'correction' ? (
              <>
                <Text style={styles.formLabel}>
                  Düzgün köhnə borc
                </Text>
                <TextInput
                  value={correctedDebt}
                  onChangeText={setCorrectedDebt}
                  editable={!isSubmitting}
                  keyboardType="decimal-pad"
                  placeholder="Düzgün məbləği yaz"
                  placeholderTextColor={colors.textLight}
                  style={styles.formInput}
                />

                <Text style={styles.formLabel}>
                  Düzəliş səbəbi
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  editable={!isSubmitting}
                  placeholder="Səbəbi mütləq qeyd et"
                  placeholderTextColor={colors.textLight}
                  multiline
                  style={[
                    styles.formInput,
                    styles.multilineInput,
                  ]}
                />
              </>
            ) : null}

            {action !== 'correction' ? (
              <>
                <Text style={styles.formLabel}>
                  Qeyd — istəyə bağlı
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  editable={!isSubmitting}
                  placeholder="Əlavə məlumat"
                  placeholderTextColor={colors.textLight}
                  style={styles.formInput}
                />
              </>
            ) : null}

            <Pressable
              disabled={isSubmitting}
              onPress={() => {
                void submitAction();
              }}
              style={({ pressed }) => [
                styles.formSubmitButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={colors.white}
                />
              )}

              <Text style={styles.formSubmitText}>
                {isSubmitting
                  ? 'Yadda saxlanılır...'
                  : 'Yadda saxla'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    paddingTop: spacing.md,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brand: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: 3,
  },
  totalBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  totalBadgeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  totalBadgeValue: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  searchContainer: {
    minWidth: 260,
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },
  dateBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  dateButton: {
    width: 44,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  dateValue: {
    minWidth: 92,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  dateValueText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  tabletBody: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  tabletListPanel: {
    width: '40%',
    minWidth: 330,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  tabletDetailPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  panelHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  panelCount: {
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  phoneList: {
    flex: 1,
  },
  listContent: {
    padding: spacing.sm,
    paddingBottom: spacing.huge,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sectionCount: {
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    textAlign: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  customerCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  selectedCustomerCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  customerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  customerNameContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  customerPhone: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  cardDebtRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardDebtItem: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 120,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  cardDebtLabel: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  cardDebtValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginTop: 3,
  },
  cardPaymentValue: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginTop: 3,
  },
  cardRemainingValue: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginTop: 3,
  },
  paidRemainingValue: {
    color: colors.success,
  },
  paidNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  paidNoticeText: {
    flex: 1,
    color: colors.success,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  detailState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  detailStateTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  detailStateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  detailsContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsAvatar: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  detailsHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  detailsName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  detailsPhone: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 3,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  balanceCard: {
    minWidth: 145,
    flexGrow: 1,
    flexBasis: '46%',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  balanceValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  balancePaidValue: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    minHeight: 48,
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  debtActionButton: {
    backgroundColor: colors.primary,
  },
  paymentActionButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  correctionButton: {
    minHeight: 46,
    flexGrow: 1,
    flexBasis: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  correctionButtonText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  actionDateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  actionDateNoticeText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    lineHeight: 17,
    fontWeight: '600',
  },
  remainingBalanceCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  remainingBalanceLabel: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  remainingBalanceValue: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  historyTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  historyCount: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  historyDay: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  historyDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  historySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historySummaryItem: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 125,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  historySummaryLabel: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  historySummaryValue: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  historySummaryDebt: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  historySummaryPaid: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  historySummaryClosing: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  adjustmentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
  adjustmentNoticeText: {
    flex: 1,
    color: colors.warning,
    fontSize: fontSize.xs,
    lineHeight: 17,
    fontWeight: '700',
  },
  historyDate: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  historyClosingDebt: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  historyEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyEntryIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  positiveEntryIcon: {
    backgroundColor: colors.warningSoft,
  },
  negativeEntryIcon: {
    backgroundColor: colors.successSoft,
  },
  historyEntryText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  historyEntryTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  historyEntryMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: 2,
  },
  historyEntryAmount: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    marginLeft: spacing.sm,
  },
  positiveAmount: {
    color: colors.warning,
  },
  negativeAmount: {
    color: colors.success,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyHistoryText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  modalTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalPlaceholder: {
    width: 42,
  },
  actionModalLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(24, 34, 48, 0.48)',
  },
  actionModalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow:
      '0 -10px 35px rgba(23, 50, 94, 0.18)',
    elevation: 12,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  actionModalCaption: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  actionModalTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: 2,
  },
  actionModalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  formLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  formInput: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
  },
  multilineInput: {
    minHeight: 86,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  formHint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  formSubmitButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },
  formSubmitText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.68,
  },
});
